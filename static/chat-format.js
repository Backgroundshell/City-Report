// Render the Markdown used in conversational replies with safe DOM operations.
// Model output never becomes HTML, and images are never loaded automatically.
function chatText(text) {
    return String(text).replace(/&(?:amp|lt|gt|quot|apos|nbsp|#\d+|#x[\da-f]+);/gi, entity => {
        const named = {'&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': '\u00a0'};
        if (Object.hasOwn(named, entity.toLowerCase())) return named[entity.toLowerCase()];
        const point = entity[2].toLowerCase() === 'x' ? parseInt(entity.slice(3, -1), 16) : Number(entity.slice(2, -1));
        return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : '\ufffd';
    });
}

function appendChatInline(parent, text, depth = 0) {
    if (depth > 4) { parent.append(document.createTextNode(chatText(text))); return; }
    const tokens = /`([^`\n]+)`|\*\*([^\n]+?)\*\*|\*([^*\n]+)\*|(?<!!)\[([^\]\n]+)\]\(([^\s)]+)\)/g;
    let offset = 0;
    for (const match of text.matchAll(tokens)) {
        parent.append(document.createTextNode(chatText(text.slice(offset, match.index))));
        let element;
        if (match[1] !== undefined) {
            element = document.createElement('code');
            element.textContent = match[1];
        } else if (match[2] !== undefined || match[3] !== undefined) {
            element = document.createElement(match[2] !== undefined ? 'strong' : 'em');
            appendChatInline(element, match[2] ?? match[3], depth + 1);
        } else {
            try {
                const url = new URL(chatText(match[5]), window.location.href);
                if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) throw new Error('Unsupported link');
                element = document.createElement('a');
                element.href = url.href;
                element.target = '_blank';
                element.rel = 'noopener noreferrer';
                appendChatInline(element, match[4], depth + 1);
            } catch { element = document.createTextNode(chatText(match[0])); }
        }
        parent.append(element);
        offset = match.index + match[0].length;
    }
    parent.append(document.createTextNode(chatText(text.slice(offset))));
}

function chatTableCells(line) {
    const cells = [];
    let cell = '', code = false;
    for (let index = 0; index < line.length; index++) {
        const char = line[index];
        if (char === '\\' && line[index + 1] === '|') { cell += '|'; index++; }
        else if (char === '`') { code = !code; cell += char; }
        else if (char === '|' && !code) { cells.push(cell.trim()); cell = ''; }
        else cell += char;
    }
    cells.push(cell.trim());
    if (line.trimStart().startsWith('|')) cells.shift();
    if (line.trimEnd().endsWith('|')) cells.pop();
    return cells;
}

function renderChatText(text) {
    const content = document.createElement('div');
    content.className = 'chat-content';
    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    const divider = line => chatTableCells(line).length > 0 && chatTableCells(line).every(cell => /^:?-{3,}:?$/.test(cell));
    const tableStart = index => index + 1 < lines.length && lines[index].includes('|') && divider(lines[index + 1]);
    const blockStart = index => /^(?:\s*```|#{1,6}\s|\s*>|\s*[-+*]\s|\s*\d+[.)]\s|\s*(?:-{3,}|\*{3,}|_{3,})\s*$)/.test(lines[index]) || tableStart(index);
    const inlineBlock = (tag, value) => { const element = document.createElement(tag); appendChatInline(element, value); return element; };
    for (let index = 0; index < lines.length;) {
        const line = lines[index];
        if (!line.trim()) { index++; continue; }
        if (/^\s*```/.test(line)) {
            const code = [];
            index++;
            while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) code.push(lines[index++]);
            const pre = document.createElement('pre'), element = document.createElement('code');
            element.textContent = code.join('\n');
            pre.append(element); content.append(pre);
            if (index < lines.length) index++;
        } else if (tableStart(index)) {
            const headers = chatTableCells(line), alignment = chatTableCells(lines[index + 1]);
            const wrapper = document.createElement('div'), table = document.createElement('table');
            wrapper.className = 'chat-table'; wrapper.tabIndex = 0;
            wrapper.setAttribute('role', 'region'); wrapper.setAttribute('aria-label', 'Tabela w odpowiedzi asystenta');
            const row = (cells, tag) => {
                const tr = document.createElement('tr');
                headers.forEach((header, column) => {
                    const cell = inlineBlock(tag, cells[column] ?? '');
                    if (tag === 'th') cell.scope = 'col';
                    if (alignment[column]?.endsWith(':')) cell.style.textAlign = alignment[column].startsWith(':') ? 'center' : 'right';
                    tr.append(cell);
                });
                return tr;
            };
            const head = document.createElement('thead'), body = document.createElement('tbody');
            head.append(row(headers, 'th')); index += 2;
            while (index < lines.length && lines[index].trim() && lines[index].includes('|')) body.append(row(chatTableCells(lines[index++]), 'td'));
            table.append(head, body); wrapper.append(table); content.append(wrapper);
        } else if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
            content.append(document.createElement('hr')); index++;
        } else if (/^#{1,6}\s/.test(line)) {
            const heading = line.match(/^(#{1,6})\s+(.*)$/);
            content.append(inlineBlock(`h${heading[1].length}`, heading[2])); index++;
        } else if (/^\s*>/.test(line)) {
            const quote = [];
            while (index < lines.length && /^\s*>/.test(lines[index])) quote.push(lines[index++].replace(/^\s*>\s?/, ''));
            content.append(inlineBlock('blockquote', quote.join('\n')));
        } else if (/^\s*(?:[-+*]|\d+[.)])\s+/.test(line)) {
            const ordered = /^\s*\d+[.)]/.test(line), list = document.createElement(ordered ? 'ol' : 'ul');
            if (ordered) list.start = parseInt(line, 10);
            const pattern = ordered ? /^\s*\d+[.)]\s+(.*)$/ : /^\s*[-+*]\s+(.*)$/;
            while (index < lines.length && pattern.test(lines[index])) list.append(inlineBlock('li', lines[index++].match(pattern)[1]));
            content.append(list);
        } else {
            const paragraph = [line]; index++;
            while (index < lines.length && lines[index].trim() && !blockStart(index)) paragraph.push(lines[index++]);
            content.append(inlineBlock('p', paragraph.join('\n')));
        }
    }
    return content;
}
