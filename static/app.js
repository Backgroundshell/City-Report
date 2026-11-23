let state={};let filter='all';const $=s=>document.querySelector(s);const $$=s=>document.querySelectorAll(s);const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
async function api(url,data){const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});if(response.status===401)window.location.replace('/login');return response}
async function load(){try{const response=await fetch('/api/overview');if(response.status===401){window.location.replace('/login'+location.hash);return}if(!response.ok)throw new Error('Nie udało się wczytać zgłoszeń');state=await response.json();render();renderAccount();renderRoute();document.body.classList.remove('auth-pending')}catch(error){toast(error.message)}}
function renderAccount(){const user=state.user;const admin=user.role==='Administrator';$('#profile-name').textContent=user.name;$('#profile-role').textContent=user.role;$('#profile-initials').textContent=user.name.split(/\s+/).map(part=>part[0]).slice(0,2).join('');$$('.admin-label,.admin-nav,[data-view="ai"],#view-admin,#view-ai').forEach(element=>element.hidden=!admin);}
$('#logout').onclick=async()=>{const button=$('#logout');button.disabled=true;try{const response=await api('/api/logout',{});if(!response.ok&&response.status!==401)throw new Error('Nie udało się wylogować. Spróbuj ponownie.');window.location.replace('/login')}catch(error){toast(error.message);button.disabled=false}};
function render(){let m=state.metrics;$('#llm-name').textContent=state.llm.model;$('#llm-endpoint').textContent=state.llm.chat.base_url;$('#chat-model').textContent=state.llm.chat.model;$('#stats').innerHTML=[['Wszystkie zgłoszenia',m.reports,'Twoje zgłoszenia'],['Nowe',m.new,'czeka na weryfikację'],['W toku',m.progress,'w trakcie obsługi'],['Rozwiązane',m.resolved,'problemów usuniętych']].map(x=>`<div><small>${x[0]}</small><strong>${x[1]}</strong><span>${x[2]}</span></div>`).join('');$('#recent').innerHTML=state.reports.filter(report=>report.user_id===state.user.id).map(card).join('')||'<p class="empty">Nie masz jeszcze zgłoszeń.</p>';if($('#report-grid'))$('#report-grid').innerHTML=state.reports.filter(r=>(filter==='all'||r.status===filter)&&([r.title,r.address,r.category_name].join(' ').toLowerCase().includes(($('#search')?.value||'').toLowerCase()))).map(card).join('');if($('#map'))$('#map').innerHTML=state.reports.map((r,i)=>`<span class="pin p${i}" title="${esc(r.title)}" style="--x:${15+(i*29)%75}%;--y:${25+(i*37)%55}%">●</span>`).join('')+`<div class="map-label">MAPA MIASTA<br><small>${state.reports.length} zgłoszenia</small></div>`;renderAdminTable();$('#category-list').innerHTML=state.categories.map(c=>`<div class="category"><i style="background:${c.color}"></i>${esc(c.name)}<small>${state.reports.filter(r=>r.category_id===c.id).length} zgłoszenia</small></div>`).join('');$('#audit-list').innerHTML=state.events.slice(0,8).map(e=>`<div class="audit-row"><b>${esc(e.event_type)}</b><span><b>#${e.id}</b> ${esc(e.details)}</span><small>${new Date(e.created_at).toLocaleString('pl-PL')}</small></div>`).join('')}
function renderAdminTable() {
    const panel = $('#admin-table');
    if (state.user.role !== 'Administrator') {
        panel.replaceChildren();
        return;
    }
    panel.innerHTML = '<table><thead><tr><th>ID / Problem</th><th>Kategoria</th><th>Status</th></tr></thead><tbody>'
        + state.reports.map(r => `<tr><td><b><a class="report-link" href="#/reports/${r.id}">#${r.id} ${esc(r.title)}</a></b><small>${esc(r.address)}</small></td><td>${esc(r.category_name)}</td><td></td></tr>`).join('')
        + '</tbody></table>';
    panel.querySelectorAll('tbody tr').forEach((row, index) => {
        row.lastElementChild.append(createStatusEditor(state.reports[index]));
    });
}
function createStatusEditor(report) {
    const select = document.createElement('select');
    select.className = 'status';
    select.dataset.id = report.id;
    select.setAttribute('aria-label', `Status zgłoszenia #${report.id}`);
    const statuses = ['Nowe', 'W toku', 'Rozwiązane'];
    let saved = report.status;
    if (!statuses.includes(saved)) {
        const previous = new Option(saved || 'Brak danych', saved || '');
        previous.disabled = true;
        select.add(previous);
    }
    for (const status of statuses) select.add(new Option(status, status));
    select.value = saved || '';
    select.onchange = async () => {
        if (select.disabled || select.value === saved) return;
        const next = select.value;
        select.disabled = true;
        try {
            const response = await api(`/api/reports/${report.id}/status`, {status:next});
            if (!response.ok) throw new Error();
            saved = next;
            toast('Status zapisany');
            await load();
        } catch {
            select.value = saved || '';
            toast('Nie udało się zapisać statusu. Spróbuj ponownie.');
        } finally {
            select.disabled = false;
        }
    };
    return select;
}
function statusBadgeClass(status) {
    if (status === 'W toku') return 'badge progress';
    if (status === 'Rozwiązane') return 'badge done';
    return 'badge';
}
function card(r){return `<article class="report-card"><div class="card-top"><span class="category-dot" style="background:${r.category_color}"></span><small>${esc(r.category_name)}</small><span class="${statusBadgeClass(r.status)}">${esc(r.status)}</span></div><h3><a class="report-link" href="#/reports/${r.id}">${esc(r.title||`Zgłoszenie #${r.id}`)}</a></h3><p>${esc(r.description)}</p><footer><span>⌖ ${esc(r.address)}</span><span>#${r.id}</span></footer></article>`}
function view(name){if(['admin','ai'].includes(name)&&state.user?.role!=='Administrator')return;$$('.view').forEach(x=>x.classList.add('hidden'));$(`#view-${name}`).classList.remove('hidden');let names={home:'Mapa zgłoszeń',reports:'Wszystkie zgłoszenia',admin:'Panel administratora',ai:'Asystent AI',detail:'Zgłoszenie'};$('#crumb').textContent=names[name];$('#title').innerHTML=name==='home'?`Dzień dobry, ${esc(state.user?.name.split(' ')[0]||'')} <span>✦</span>`:names[name];$$('nav button').forEach(x=>x.classList.toggle('active',x.dataset.view===name))}
$$('[data-view]').forEach(x=>x.onclick=()=>{location.hash='/'+x.dataset.view});$$('[data-action="new-report"]').forEach(x=>x.onclick=reportModal);$('#status-filter')?.addEventListener('change',e=>{filter=e.target.value;render()});$('#search')?.addEventListener('input',render);
function toast(t){let e=$('#toast');e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2500)}
let detailRequest;
let previousSection;
function renderRoute() {
    if (!state.user) return;
    detailRequest?.abort();
    const route = location.hash.slice(1);
    const match = /^\/reports\/([1-9]\d{0,18})$/.exec(route);
    if (match) {
        detailRequest = new AbortController();
        showReport(match[1], detailRequest.signal);
        return;
    }
    const admin = state.user.role === 'Administrator';
    previousSection = admin && ['/admin','/ai'].includes(route) ? route.slice(1) : 'home';
    view(previousSection);
    document.title = 'CityReport — problemy w mieście';
}
async function showReport(id, signal) {
    view('detail');
    window.scrollTo(0, 0);
    const label = 'Zgłoszenie #' + id;
    $('#crumb').textContent = label;
    $('#title').textContent = label;
    document.title = label + ' — CityReport';
    const back = $('#detail-back');
    const origin = previousSection || (state.user.role === 'Administrator' ? 'admin' : 'home');
    back.href = '#/' + origin;
    back.textContent = {home:'← Moje zgłoszenia', admin:'← Panel obsługi', ai:'← Asystent AI'}[origin];
    const body = $('#detail-body');
    const feedback = $('#detail-feedback');
    const image = $('#detail-image');
    body.hidden = true;
    image.hidden = true;
    image.removeAttribute('src');
    feedback.textContent = 'Wczytywanie zgłoszenia…';
    try {
        const response = await fetch('/api/reports/' + id, {signal});
        if (response.status === 401) { location.replace('/login' + location.hash); return; }
        if (!response.ok) throw new Error(response.status === 404 ? 'Nie znaleziono zgłoszenia.' : 'Nie udało się wczytać zgłoszenia.');
        const report = await response.json();
        if (signal.aborted) return;
        $('#title').textContent = report.title || label;
        document.title = (report.title || label) + ' — CityReport';
        const admin = state.user.role === 'Administrator';
        $('#detail-meta').textContent = admin
            ? [report.category_name, report.author_name].filter(Boolean).join(' · ')
            : report.category_name || '';
        const status = $('#detail-status-value');
        if (admin) {
            status.replaceChildren(createStatusEditor(report));
            status.className = '';
        } else {
            status.textContent = report.status || 'Brak danych';
            status.className = statusBadgeClass(report.status);
        }
        $('#detail-address').textContent = report.address || 'Brak adresu.';
        $('#detail-description').textContent = report.description || 'Brak opisu.';
        const source = $('#detail-source');
        source.hidden = !admin;
        if (admin) {
            source.className = ['ai','ai_edited'].includes(report.description_source) ? 'ai-source' : '';
            source.textContent = {ai:'Opis wygenerowany przez AI', ai_edited:'Opis AI po edycji zgłaszającego',
                manual:'Opis zgłaszającego'}[report.description_source] || 'Źródło opisu nieznane';
        } else {
            source.textContent = '';
        }
        const photoMessage = $('#detail-no-photo');
        photoMessage.textContent = report.photo_data ? 'Nie udało się wyświetlić zdjęcia.' : 'Brak zdjęcia.';
        photoMessage.hidden = false;
        if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(report.photo_data || '')) {
            image.onerror = () => { image.hidden = true; photoMessage.hidden = false; };
            image.src = report.photo_data;
            image.hidden = false;
            photoMessage.hidden = true;
        }
        feedback.textContent = '';
        body.hidden = false;
    } catch (error) {
        if (!signal.aborted) feedback.textContent = error instanceof TypeError ? 'Nie można połączyć się z aplikacją.' : error.message;
    }
}
window.addEventListener('hashchange', renderRoute);
$('#modal .close').onclick=()=>$('#modal').close();
function reportModal(){ $('#modal-body').innerHTML=`<div class="modal-inner"><small>NOWE ZGŁOSZENIE</small><h2>Zgłoś problem w mieście</h2><p>Opis możesz wpisać samodzielnie albo zostawić puste pole. Jeśli dodasz zdjęcie, backend poprosi lokalne AI o sugestię, którą możesz zaakceptować lub zmienić.</p><label>Tytuł problemu<input name="title" required placeholder="np. Uszkodzona ławka"></label><label>Kategoria<select name="category_id">${state.categories.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label><label>Opis <span class="optional">(opcjonalny przy zdjęciu)</span><textarea name="description" id="description" placeholder="Co się stało? Możesz użyć sugestii AI poniżej."></textarea></label><button type="button" class="ai-fill" id="describe">✦ Zaproponuj opis ze zdjęcia</button><label>Adres / lokalizacja<input name="address" required placeholder="ulica i numer"></label><div class="twocol"><label>Szerokość geograficzna<input name="latitude" value="50.0618"></label><label>Długość geograficzna<input name="longitude" value="19.9383"></label></div><label>Zdjęcie problemu<input type="file" accept="image/*" id="photo"></label><input type="hidden" name="photo_data"><input type="hidden" name="photo_name"><button class="primary submit">Wyślij zgłoszenie</button></div>`;
    const modal = $('#modal');
    const form = $('#modal-form');
    const photo = $('#photo');
    const description = $('#description');
    const describe = $('#describe');
    const submit = form.querySelector('button.submit');
    const photoData = form.elements.photo_data;
    const photoName = form.elements.photo_name;
    let suggestion = null;
    let usingSuggestion = false;
    let reading = false;
    let generating = false;
    let saving = false;

    function updateButtons() {
        submit.disabled = reading || generating || saving;
        describe.disabled = submit.disabled;
    }
    description.onbeforeinput = event => {
        if (description.selectionStart === 0 && description.selectionEnd === description.value.length
                && (event.inputType.startsWith('insert') || event.inputType.startsWith('delete'))) {
            usingSuggestion = false;
        }
    };
    description.oninput = () => {
        if (!description.value.trim()) usingSuggestion = false;
        if (suggestion !== null && description.value.trim() === suggestion) usingSuggestion = true;
    };
    photo.onchange = () => {
        const file = photo.files[0];
        photoData.value = '';
        photoName.value = '';
        reading = Boolean(file);
        updateButtons();
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            if (photo.files[0] !== file) return;
            reading = false;
            if (reader.result) {
                photoData.value = reader.result;
                photoName.value = file.name;
            } else toast('Nie udało się wczytać zdjęcia.');
            updateButtons();
        };
        reader.readAsDataURL(file);
    };
    describe.onclick = async () => {
        const image = photoData.value;
        if (!image) return toast('Najpierw wybierz zdjęcie');
        generating = true;
        updateButtons();
        describe.textContent = 'AI analizuje zdjęcie…';
        const originalText = description.value;
        try {
            const response = await api('/api/ai/describe', {image_data:image});
            const result = await response.json();
            if (!modal.open || !description.isConnected || photoData.value !== image) return;
            if (!response.ok) return toast(result.error);
            if (description.value !== originalText) return toast('Opis został zmieniony podczas analizy. Zachowano wpisany tekst.');
            description.value = result.description;
            suggestion = description.value.trim();
            usingSuggestion = true;
            toast('Sugestia gotowa — możesz ją teraz zmienić');
        } catch {
            toast('Nie udało się pobrać sugestii AI.');
        } finally {
            generating = false;
            describe.textContent = '✦ Zaproponuj opis ze zdjęcia';
            updateButtons();
        }
    };
    form.onsubmit = async event => {
        event.preventDefault();
        if (submit.disabled) return;
        saving = true;
        updateButtons();
        try {
            const data = Object.fromEntries(new FormData(form));
            data.description_source = usingSuggestion
                ? (data.description.trim() === suggestion ? 'ai' : 'ai_edited') : 'manual';
            const response = await api('/api/reports', data);
            const result = await response.json();
            if (!response.ok) return toast(result.error);
            if (description.isConnected && modal.open) modal.close();
            toast('Zgłoszenie zapisane');
            await load();
            location.hash = '/reports/' + result.id;
        } catch {
            toast('Nie udało się zapisać zgłoszenia.');
        } finally {
            saving = false;
            updateButtons();
        }
    };
    modal.showModal();
}
$('#new-report').onclick=reportModal;$('#hero-report').onclick=reportModal;$('#my-report-button').onclick=reportModal;$('#add-category').onclick=()=>{let name=prompt('Nazwa nowej kategorii:');if(name)api('/api/categories',{name}).then(()=>{toast('Kategoria dodana');load()})};
let chatHistory=[];
let chatBusy=false;
let chatRetry=null;
const chatWelcome='Cześć! Widzę wszystkie zgłoszenia i ich opisy, adresy, kategorie oraz statusy. Mogę wyjaśnić, czego dotyczą, podsumować problemy lub zaproponować priorytety. Zapytaj też o konkretne zgłoszenie, np. #1.';
function addChatMessage(role,text,label,formatted=false){
    const element=document.createElement('div');
    element.className=`message ${role}`;
    if(label){const heading=document.createElement('b');heading.textContent=label;element.append(heading)}
    if(formatted){element.classList.add('formatted-message');element.append(renderChatText(text))}
    else{const paragraph=document.createElement('p');paragraph.textContent=text;element.append(paragraph)}
    $('#chat-messages').append(element);
    element.scrollIntoView({block:'nearest'});
    return element;
}
const chatPriorities={critical:{label:'Krytyczny',rank:0},high:{label:'Wysoki',rank:1},medium:{label:'Średni',rank:2},low:{label:'Niski',rank:3}};
function chatNode(tag,className,text){
    const element=document.createElement(tag);
    if(className)element.className=className;
    if(text!==undefined)element.textContent=text;
    return element;
}
function addChatAnalysis(result,label){
    if(typeof result.summary!=='string'||!result.summary.trim()||!Array.isArray(result.reports)
        ||result.reports.some(report=>!report||!Number.isInteger(report.id)||!Object.hasOwn(chatPriorities,report.priority)||typeof report.reason!=='string'||!report.reason.trim())){
        throw new Error('Nie udało się odczytać analizy zgłoszeń. Spróbuj ponownie.');
    }
    const element=addChatMessage('bot',result.summary,label);
    element.classList.add('analysis-message');
    element.querySelector('p').classList.add('analysis-summary');
    const cards=chatNode('div','analysis-reports');
    const reports=[...result.reports].sort((a,b)=>chatPriorities[a.priority].rank-chatPriorities[b.priority].rank);
    for(const report of reports){
        const card=chatNode('article',`analysis-report priority-${report.priority}`);
        const heading=chatNode('div','analysis-report-heading');
        const link=chatNode('a','analysis-id report-link',`#${report.id}`);
        link.href='#/reports/'+report.id;
        heading.append(link,chatNode('span',`priority-badge priority-${report.priority}`,chatPriorities[report.priority].label));
        card.append(heading,chatNode('h4','',report.title||`Zgłoszenie #${report.id}`));
        const details=chatNode('dl','analysis-details');
        for(const [name,value] of [['Kategoria',report.category],['Adres',report.address],['Status',report.status]]){
            const row=chatNode('div','');
            row.append(chatNode('dt','',name),chatNode('dd','',value||'Brak danych'));
            details.append(row);
        }
        card.append(details,chatNode('p','analysis-reason',report.reason));
        if(Array.isArray(report.similar_to)&&report.similar_to.length){
            const related=chatNode('p','analysis-related','Podobne zgłoszenia: ');
            report.similar_to.forEach((id,index)=>{
                if(index)related.append(', ');
                const peer=chatNode('a','report-link','#'+id);
                peer.href='#/reports/'+id;
                related.append(peer);
            });
            card.append(related);
            if(typeof report.evidence==='string')card.append(chatNode('blockquote','analysis-evidence',report.evidence));
        }
        cards.append(card);
    }
    element.append(chatNode('p','analysis-note','Sugerowane priorytety AI. Decyzję podejmuje administrator.'),cards);
    element.scrollIntoView({block:'start'});
    return result.summary+'\n'+reports.map(report=>`#${report.id} — ${chatPriorities[report.priority].label}: ${report.reason}${Array.isArray(report.similar_to)?' Podobne: '+report.similar_to.map(id=>`#${id}`).join(', '):''}`).join('\n');
}
function resetChat(){
    if(chatBusy)return;
    chatHistory=[];
    chatRetry=null;
    $('#chat-messages').replaceChildren();
    addChatMessage('bot',chatWelcome,'Asystent CityReport');
    $('#chat-status').textContent='Przy każdym pytaniu pobieram aktualne dane wszystkich zgłoszeń.';
    $('#chat-input').focus();
}
async function sendChat(message,mode='chat'){
    if(chatBusy||state.user?.role!=='Administrator')return;
    const input=$('#chat-input');
    const question=message.trim();
    if(!question)return;
    if(question.length>2000){toast('Pytanie może mieć maksymalnie 2000 znaków.');return}
    chatBusy=true;
    $$('#chat-form button,[data-chat-prompt],#chat-reset').forEach(button=>button.disabled=true);
    input.disabled=true;
    addChatMessage('user',question);
    input.value='';
    const pending=addChatMessage('bot',mode==='prioritize'?'Ustalam sugerowane priorytety nierozwiązanych zgłoszeń…':'Analizuję aktualne zgłoszenia…','Asystent CityReport');
    $('#chat-messages').setAttribute('aria-busy','true');
    try{
        const response=await api('/api/ai/chat',{message:question,history:chatHistory.slice(-12),mode});
        if(response.status===401)throw new Error('Sesja wygasła. Zaloguj się ponownie.');
        let result;
        try{result=await response.json()}catch{throw new Error('Serwer zwrócił nieprawidłową odpowiedź. Spróbuj ponownie.')}
        if(!result||typeof result!=='object')throw new Error('Serwer zwrócił nieprawidłową odpowiedź. Spróbuj ponownie.');
        if(!response.ok)throw new Error(result.error||'Nie udało się uzyskać odpowiedzi.');
        pending.remove();
        let answer;
        if(['prioritize','similar'].includes(result.mode||mode))answer=addChatAnalysis(result,`Asystent • ${result.model}`);
        else{
            if(typeof result.answer!=='string'||!result.answer.trim())throw new Error('Model nie zwrócił odpowiedzi. Spróbuj ponownie.');
            answer=result.answer;
            addChatMessage('bot',answer,`Asystent • ${result.model}`,true);
        }
        chatHistory.push({role:'user',content:question},{role:'assistant',content:answer.slice(0,6000)});
        chatHistory=chatHistory.slice(-12);
        chatRetry=null;
        $('#chat-status').textContent=`Analizowane zgłoszenia: ${result.report_count}. Dane z ${new Date(result.context_updated_at).toLocaleString('pl-PL')}.`;
    }catch(error){
        pending.remove();
        const message=error instanceof TypeError?'Nie można połączyć się z aplikacją. Sprawdź połączenie i spróbuj ponownie.':error.message;
        addChatMessage('bot',`${message} Możesz ponowić pytanie.`, 'Nie udało się odpowiedzieć');
        input.value=question;
        chatRetry={question,mode};
    }finally{
        chatBusy=false;
        $('#chat-messages').setAttribute('aria-busy','false');
        $$('#chat-form button,[data-chat-prompt],#chat-reset').forEach(button=>button.disabled=false);
        input.disabled=false;
        input.focus();
    }
}
$('#chat-form').onsubmit=event=>{event.preventDefault();const question=$('#chat-input').value;sendChat(question,chatRetry?.question===question.trim()?chatRetry.mode:'chat')};
$$('[data-chat-prompt]').forEach(button=>button.onclick=()=>sendChat(button.dataset.chatPrompt,button.dataset.chatMode||'chat'));
$('#chat-reset').onclick=resetChat;
load();
