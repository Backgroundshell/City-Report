const cityUI = Object.fromEntries([
    'feedback', 'metrics', 'case-list', 'empty', 'case-detail', 'refresh', 'search', 'filter',
    'case-number', 'case-title', 'report-link', 'report-address', 'report-status',
    'case-department', 'case-status', 'message-count', 'messages', 'settings-form',
    'message-form', 'message-direction', 'message-body', 'action-feedback', 'new-case',
    'compose-dialog', 'compose-close', 'compose-form', 'compose-report', 'compose-department',
    'compose-subject', 'compose-body', 'compose-feedback',
].map(name => [name, document.querySelector('#city-' + name)]));

let cityData = {cases: [], departments: {}, statuses: {}};
let cityActiveCase = null;
let cityViewRequest;
let cityComposerRequest;
let cityComposerReports = [];

async function cityRequest(url, data, signal) {
    const response = await fetch(url, data === undefined ? {signal} : {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data), signal,
    });
    if (response.status === 401) {
        location.replace('/login' + location.hash);
        throw new Error('Sesja wygasła. Zaloguj się ponownie.');
    }
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Nie udało się zapisać zmian.');
    return result;
}

function cityError(error) {
    return error instanceof TypeError ? 'Nie można połączyć się z CityReport. Spróbuj ponownie.' : error.message;
}

function cancelCityView() {
    cityViewRequest?.abort();
    cityComposerRequest?.abort();
    if (cityUI['compose-dialog'].open && cityUI['compose-form'].dataset.busy !== 'true') cityUI['compose-dialog'].close();
}

function cityOptions(select, options) {
    select.replaceChildren(...Object.entries(options).map(([value, label]) => new Option(label, value)));
}

function cityDate(value) {
    return new Date(value).toLocaleString('pl-PL', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});
}

function renderCityList(selectedId = cityActiveCase?.id) {
    const query = cityUI.search.value.trim().toLocaleLowerCase('pl-PL');
    const status = cityUI.filter.value;
    const cases = cityData.cases.filter(item => (status === 'all' || item.status === status)
        && [item.id, item.report_id, item.subject, item.address, cityData.departments[item.department]]
            .join(' ').toLocaleLowerCase('pl-PL').includes(query));
    cityUI['case-list'].replaceChildren();
    for (const item of cases) {
        const card = document.createElement('a');
        card.className = 'city-case-card';
        card.href = '#/city/' + item.id;
        if (String(item.id) === String(selectedId)) card.setAttribute('aria-current', 'true');
        card.innerHTML = '<div class="city-card-meta"><span>Sprawa #' + item.id + ' · Zgłoszenie #' + item.report_id
            + '</span><span class="city-stage city-stage--' + item.status + '">' + esc(cityData.statuses[item.status]) + '</span></div>'
            + '<strong>' + esc(item.subject) + '</strong><p>' + esc(cityData.departments[item.department]) + '</p>'
            + '<p>' + esc(item.address) + '</p><p class="city-card-preview">' + esc(item.last_message || '') + '</p>';
        cityUI['case-list'].append(card);
    }
    if (!cases.length) {
        const empty = document.createElement('p');
        empty.className = 'city-list-empty';
        empty.textContent = cityData.cases.length ? 'Brak spraw pasujących do wyszukiwania.' : 'Nie ma jeszcze spraw. Dodaj pierwszą, aby rozpocząć korespondencję demo.';
        cityUI['case-list'].append(empty);
    }
}

function renderCityMetrics() {
    cityUI.metrics.innerHTML = Object.entries(cityData.statuses).map(([key, label]) =>
        '<div class="city-metric"><span>' + esc(label) + '</span><strong>'
        + cityData.cases.filter(item => item.status === key).length + '</strong></div>').join('');
}

function renderCityCase(item) {
    const changed = cityActiveCase?.id !== item.id;
    const previousMessages = cityActiveCase?.messages.length;
    const scroll = cityUI.messages.scrollTop;
    cityActiveCase = item;
    cityUI.empty.hidden = true;
    cityUI['case-detail'].hidden = false;
    cityUI['case-number'].textContent = 'SPRAWA #' + item.id + ' · KORESPONDENCJA DEMO';
    cityUI['case-title'].textContent = item.subject;
    cityUI['report-link'].href = '#/reports/' + item.report_id;
    cityUI['report-link'].textContent = '#' + item.report_id + ' ' + item.report_title;
    cityUI['report-address'].textContent = item.address;
    cityUI['report-status'].textContent = 'Status zgłoszenia: ' + item.report_status + ' · Priorytet: ' + reportPriorityLabel(item.report_priority);
    cityOptions(cityUI['case-department'], cityData.departments);
    cityOptions(cityUI['case-status'], cityData.statuses);
    cityUI['case-department'].value = item.department;
    cityUI['case-status'].value = item.status;
    cityUI['message-count'].textContent = 'Wiadomości: ' + item.messages.length;
    cityUI.messages.replaceChildren();
    for (const message of item.messages) {
        const bubble = document.createElement('article');
        bubble.className = 'city-message' + (message.direction === 'incoming' ? ' city-message--incoming' : '');
        const heading = document.createElement('header');
        const author = document.createElement('b');
        author.textContent = message.direction === 'incoming'
            ? cityData.departments[message.department] + ' · odpowiedź demo' : message.author_name + ' · do służb';
        const time = document.createElement('time');
        time.dateTime = message.created_at;
        time.textContent = cityDate(message.created_at);
        heading.append(author, time);
        const body = document.createElement('p');
        body.textContent = message.body;
        bubble.append(heading, body);
        cityUI.messages.append(bubble);
    }
    if (changed) {
        cityUI['message-form'].reset();
        cityUI['action-feedback'].textContent = '';
    }
    cityUI.messages.scrollTop = changed || previousMessages !== item.messages.length ? cityUI.messages.scrollHeight : scroll;
    renderCityList(item.id);
}

async function renderCityView(caseId = null) {
    if (state.user?.role !== 'Administrator') return;
    cityViewRequest?.abort();
    const controller = cityViewRequest = new AbortController();
    cityUI.feedback.textContent = '';
    cityUI.refresh.disabled = true;
    document.querySelector('#view-city').setAttribute('aria-busy', 'true');
    try {
        const data = await cityRequest('/api/city/cases', undefined, controller.signal);
        if (controller.signal.aborted) return;
        cityData = data;
        renderCityMetrics();
        renderCityList(caseId);
        const previousId = cityData.cases.some(item => item.id === cityActiveCase?.id) ? cityActiveCase.id : null;
        const selected = caseId || previousId || cityData.cases[0]?.id;
        if (!selected) {
            cityActiveCase = null;
            cityUI['case-detail'].hidden = true;
            cityUI.empty.hidden = false;
            return;
        }
        const item = await cityRequest('/api/city/cases/' + selected, undefined, controller.signal);
        if (!controller.signal.aborted) renderCityCase(item);
    } catch (error) {
        if (controller.signal.aborted) return;
        cityUI.feedback.textContent = cityError(error);
        cityUI['case-detail'].hidden = true;
        cityUI.empty.hidden = false;
    } finally {
        if (!controller.signal.aborted) {
            cityUI.refresh.disabled = false;
            document.querySelector('#view-city').setAttribute('aria-busy', 'false');
        }
    }
}

function cityPrefillReport() {
    const report = cityComposerReports.find(item => String(item.id) === cityUI['compose-report'].value);
    if (!report) return;
    const categoryDepartments = {'Droga i chodnik': 'roads', 'Oświetlenie': 'lighting', 'Czystość': 'cleaning', 'Zieleń': 'greenery'};
    cityUI['compose-department'].value = categoryDepartments[report.category_name] || 'roads';
    cityUI['compose-subject'].value = ('Zgłoszenie #' + report.id + ': ' + report.title).slice(0, 160);
    cityUI['compose-body'].value = 'Proszę o weryfikację problemu: ' + report.title + '.\nLokalizacja: '
        + report.address + '.\nProszę o informację o planowanym terminie naprawy.';
}

async function openCityComposer(report = null) {
    if (state.user?.role !== 'Administrator' || cityUI['compose-dialog'].open) return;
    cityComposerRequest?.abort();
    const controller = cityComposerRequest = new AbortController();
    cityUI['new-case'].disabled = true;
    try {
        const data = await cityRequest('/api/city/cases', undefined, controller.signal);
        if (controller.signal.aborted) return;
        cityData = data;
        const existing = report && cityData.cases.find(item => item.report_id === report.id);
        if (existing) {
            location.hash = '/city/' + existing.id;
            return;
        }
        const available = new Map(state.reports.map(item => [item.id, item]));
        if (report) available.set(report.id, report);
        const assigned = new Set(cityData.cases.map(item => item.report_id));
        cityComposerReports = [...available.values()].filter(item => !assigned.has(item.id));
        if (!cityComposerReports.length) {
            toast(state.reports.length ? 'Wszystkie zgłoszenia mają już sprawę miejską.' : 'Dodaj najpierw zgłoszenie mieszkańca.');
            return;
        }
        cityUI['compose-form'].reset();
        cityUI['compose-feedback'].textContent = '';
        cityUI['compose-report'].replaceChildren(...cityComposerReports.map(item => new Option('#' + item.id + ' ' + item.title, item.id)));
        cityOptions(cityUI['compose-department'], cityData.departments);
        if (report) cityUI['compose-report'].value = String(report.id);
        cityPrefillReport();
        cityUI['compose-dialog'].showModal();
    } catch (error) {
        if (!controller.signal.aborted) toast(cityError(error));
    } finally {
        cityUI['new-case'].disabled = false;
    }
}

function cityFormBusy(form, busy) {
    form.dataset.busy = String(busy);
    form.setAttribute('aria-busy', String(busy));
    form.querySelectorAll('input,select,textarea,button').forEach(control => { control.disabled = busy; });
}

cityUI['new-case'].addEventListener('click', () => openCityComposer());
cityUI.refresh.addEventListener('click', () => renderCityView(/^#\/city\/(\d+)$/.exec(location.hash)?.[1] || null));
cityUI.search.addEventListener('input', () => renderCityList());
cityUI.filter.addEventListener('change', () => renderCityList());
cityUI['compose-report'].addEventListener('change', cityPrefillReport);
cityUI['compose-close'].addEventListener('click', () => cityUI['compose-dialog'].close());
cityUI['compose-dialog'].addEventListener('cancel', event => {
    if (cityUI['compose-form'].dataset.busy === 'true') event.preventDefault();
});
cityUI['message-direction'].addEventListener('change', () => {
    cityUI['message-body'].placeholder = cityUI['message-direction'].value === 'incoming'
        ? 'Zapisz przykładową odpowiedź służb miejskich…' : 'Dodaj informacje o problemie lub ustaleniach…';
});

cityUI['compose-form'].addEventListener('submit', async event => {
    event.preventDefault();
    const form = cityUI['compose-form'];
    if (form.dataset.busy === 'true') return;
    const data = {report_id: Number(cityUI['compose-report'].value), department: cityUI['compose-department'].value,
        subject: cityUI['compose-subject'].value, body: cityUI['compose-body'].value};
    cityUI['compose-feedback'].textContent = '';
    cityFormBusy(form, true);
    cityUI['compose-close'].disabled = true;
    try {
        const result = await cityRequest('/api/city/cases', data);
        cityUI['compose-dialog'].close();
        location.hash = '/city/' + result.id;
        toast('Utworzono sprawę miejską w trybie demo.');
        await load();
    } catch (error) {
        cityUI['compose-feedback'].textContent = cityError(error);
    } finally {
        cityFormBusy(form, false);
        cityUI['compose-close'].disabled = false;
    }
});

cityUI['settings-form'].addEventListener('submit', async event => {
    event.preventDefault();
    const form = cityUI['settings-form'];
    if (!cityActiveCase || form.dataset.busy === 'true') return;
    const caseId = cityActiveCase.id;
    const data = {department: cityUI['case-department'].value, status: cityUI['case-status'].value};
    cityUI['action-feedback'].textContent = '';
    cityFormBusy(form, true);
    try {
        await cityRequest('/api/city/cases/' + caseId + '/settings', data);
        toast('Zapisano służbę i etap naprawy.');
        await load();
    } catch (error) {
        cityUI['action-feedback'].textContent = cityError(error);
    } finally {
        cityFormBusy(form, false);
    }
});

cityUI['message-form'].addEventListener('submit', async event => {
    event.preventDefault();
    const form = cityUI['message-form'];
    if (!cityActiveCase || form.dataset.busy === 'true') return;
    const caseId = cityActiveCase.id;
    const data = {direction: cityUI['message-direction'].value, body: cityUI['message-body'].value};
    cityUI['action-feedback'].textContent = '';
    cityFormBusy(form, true);
    try {
        await cityRequest('/api/city/cases/' + caseId + '/messages', data);
        if (cityActiveCase?.id === caseId) cityUI['message-body'].value = '';
        toast('Zapisano wiadomość demo.');
        await load();
    } catch (error) {
        cityUI['action-feedback'].textContent = cityError(error);
    } finally {
        cityFormBusy(form, false);
    }
});
