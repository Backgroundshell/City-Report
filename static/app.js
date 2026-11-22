let state={};let filter='all';const $=s=>document.querySelector(s);const $$=s=>document.querySelectorAll(s);const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
async function api(url,data){const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});if(response.status===401)window.location.replace('/login');return response}
async function load(){try{const response=await fetch('/api/overview');if(response.status===401){window.location.replace('/login');return}if(!response.ok)throw new Error('Nie udało się wczytać zgłoszeń');state=await response.json();render();renderAccount();document.body.classList.remove('auth-pending')}catch(error){toast(error.message)}}
function renderAccount(){const user=state.user;const admin=user.role==='Administrator';$('#profile-name').textContent=user.name;$('#profile-role').textContent=user.role;$('#profile-initials').textContent=user.name.split(/\s+/).map(part=>part[0]).slice(0,2).join('');$$('.admin-label,.admin-nav,[data-view="ai"],#view-admin,#view-ai').forEach(element=>element.hidden=!admin);if($('#view-home').classList.contains('hidden')&&!admin)view('home');if(!$('#view-home').classList.contains('hidden'))$('#title').innerHTML=`Dzień dobry, ${esc(user.name.split(' ')[0])} <span>✦</span>`}
$('#logout').onclick=async()=>{const button=$('#logout');button.disabled=true;try{const response=await api('/api/logout',{});if(!response.ok&&response.status!==401)throw new Error('Nie udało się wylogować. Spróbuj ponownie.');window.location.replace('/login')}catch(error){toast(error.message);button.disabled=false}};
function render(){let m=state.metrics;$('#llm-name').textContent=state.llm.model;$('#llm-endpoint').textContent=state.llm.chat.base_url;$('#chat-model').textContent=state.llm.chat.model;$('#stats').innerHTML=[['Wszystkie zgłoszenia',m.reports,'Twoje zgłoszenia'],['Nowe',m.new,'czeka na weryfikację'],['W toku',m.progress,'w trakcie obsługi'],['Rozwiązane',m.resolved,'problemów usuniętych']].map(x=>`<div><small>${x[0]}</small><strong>${x[1]}</strong><span>${x[2]}</span></div>`).join('');$('#recent').innerHTML=state.reports.filter(report=>report.user_id===state.user.id).slice(0,4).map(card).join('')||'<p class="empty">Nie masz jeszcze zgłoszeń.</p>';if($('#report-grid'))$('#report-grid').innerHTML=state.reports.filter(r=>(filter==='all'||r.status===filter)&&([r.title,r.address,r.category_name].join(' ').toLowerCase().includes(($('#search')?.value||'').toLowerCase()))).map(card).join('');if($('#map'))$('#map').innerHTML=state.reports.map((r,i)=>`<span class="pin p${i}" title="${esc(r.title)}" style="--x:${15+(i*29)%75}%;--y:${25+(i*37)%55}%">●</span>`).join('')+`<div class="map-label">MAPA MIASTA<br><small>${state.reports.length} zgłoszenia</small></div>`;$('#admin-table').innerHTML='<table><thead><tr><th>ID / Problem</th><th>Kategoria</th><th>Status</th></tr></thead><tbody>'+state.reports.map(r=>`<tr><td><b>#${r.id} ${esc(r.title)}</b><small>${esc(r.address)}</small></td><td>${esc(r.category_name)}</td><td><select class="status" data-id="${r.id}">${['Nowe','W toku','Rozwiązane'].map(s=>`<option ${s===r.status?'selected':''}>${s}</option>`).join('')}</select></td></tr>`).join('')+'</tbody></table>';$('#category-list').innerHTML=state.categories.map(c=>`<div class="category"><i style="background:${c.color}"></i>${esc(c.name)}<small>${state.reports.filter(r=>r.category_id===c.id).length} zgłoszenia</small></div>`).join('');$('#audit-list').innerHTML=state.events.slice(0,8).map(e=>`<div class="audit-row"><b>${e.event_type}</b><span>${esc(e.details)}</span><small>${new Date(e.created_at).toLocaleString('pl-PL')}</small></div>`).join('');$$('.status').forEach(s=>s.onchange=async e=>{await api(`/api/reports/${e.target.dataset.id}/status`,{status:e.target.value});toast('Status zapisany');load()})}
function card(r){return `<article class="report-card"><div class="card-top"><span class="category-dot" style="background:${r.category_color}"></span><small>${esc(r.category_name)}</small><span class="badge ${r.status==='Rozwiązane'?'done':r.status==='W toku'?'progress':''}">${r.status}</span></div><h3>${esc(r.title)}</h3><p>${esc(r.description)}</p><footer><span>⌖ ${esc(r.address)}</span><span>#${r.id}</span></footer></article>`}
function view(name){if(['admin','ai'].includes(name)&&state.user?.role!=='Administrator')return;$$('.view').forEach(x=>x.classList.add('hidden'));$(`#view-${name}`).classList.remove('hidden');let names={home:'Mapa zgłoszeń',reports:'Wszystkie zgłoszenia',admin:'Panel administratora',ai:'Asystent AI'};$('#crumb').textContent=names[name];$('#title').innerHTML=name==='home'?`Dzień dobry, ${esc(state.user?.name.split(' ')[0]||'')} <span>✦</span>`:names[name];$$('nav button').forEach(x=>x.classList.toggle('active',x.dataset.view===name))}
$$('[data-view]').forEach(x=>x.onclick=()=>view(x.dataset.view));$$('[data-action="new-report"]').forEach(x=>x.onclick=reportModal);$('#status-filter')?.addEventListener('change',e=>{filter=e.target.value;render()});$('#search')?.addEventListener('input',render);
function toast(t){let e=$('#toast');e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2500)}
$('#modal .close').onclick=()=>$('#modal').close();
function reportModal(){ $('#modal-body').innerHTML=`<div class="modal-inner"><small>NOWE ZGŁOSZENIE</small><h2>Zgłoś problem w mieście</h2><p>Opis możesz wpisać samodzielnie albo zostawić puste pole. Jeśli dodasz zdjęcie, backend poprosi lokalne AI o sugestię, którą możesz zaakceptować lub zmienić.</p><label>Tytuł problemu<input name="title" required placeholder="np. Uszkodzona ławka"></label><label>Kategoria<select name="category_id">${state.categories.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label><label>Opis <span class="optional">(opcjonalny przy zdjęciu)</span><textarea name="description" id="description" placeholder="Co się stało? Możesz użyć sugestii AI poniżej."></textarea></label><button type="button" class="ai-fill" id="describe">✦ Zaproponuj opis ze zdjęcia</button><label>Adres / lokalizacja<input name="address" required placeholder="ulica i numer"></label><div class="twocol"><label>Szerokość geograficzna<input name="latitude" value="50.0618"></label><label>Długość geograficzna<input name="longitude" value="19.9383"></label></div><label>Zdjęcie problemu<input type="file" accept="image/*" id="photo"></label><input type="hidden" name="photo_data"><input type="hidden" name="photo_name"><button class="primary submit">Wyślij zgłoszenie</button></div>`;$('#modal').showModal();$('#photo').onchange=e=>{let f=e.target.files[0];if(!f)return;let reader=new FileReader();reader.onload=()=>{$('[name=photo_data]').value=reader.result;$('[name=photo_name]').value=f.name};reader.readAsDataURL(f)};$('#describe').onclick=async()=>{let image=$('[name=photo_data]').value;if(!image)return toast('Najpierw wybierz zdjęcie');$('#describe').textContent='AI analizuje zdjęcie...';let r=await api('/api/ai/describe',{image_data:image});let o=await r.json();if(r.ok){$('#description').value=o.description;toast('Sugestia gotowa — możesz ją teraz zmienić')}else toast(o.error);$('#describe').textContent='✦ Zaproponuj opis ze zdjęcia'};$('#modal-form').onsubmit=async e=>{e.preventDefault();let data=Object.fromEntries(new FormData(e.target));let r=await api('/api/reports',data);let o=await r.json();if(r.ok){$('#modal').close();toast(o.ai_generated?'Zgłoszenie zapisane z opisem AI':'Zgłoszenie zapisane');load()}else toast(o.error)}}
$('#new-report').onclick=reportModal;$('#hero-report').onclick=reportModal;$('#my-report-button').onclick=reportModal;$('#add-category').onclick=()=>{let name=prompt('Nazwa nowej kategorii:');if(name)api('/api/categories',{name}).then(()=>{toast('Kategoria dodana');load()})};
let chatHistory=[];
let chatBusy=false;
const chatWelcome='Cześć! Widzę wszystkie zgłoszenia i ich opisy, adresy, kategorie oraz statusy. Mogę wyjaśnić, czego dotyczą, podsumować problemy lub zaproponować priorytety. Zapytaj też o konkretne zgłoszenie, np. #1.';
function addChatMessage(role,text,label){
    const element=document.createElement('div');
    element.className=`message ${role}`;
    if(label){const heading=document.createElement('b');heading.textContent=label;element.append(heading)}
    const paragraph=document.createElement('p');paragraph.textContent=text;element.append(paragraph);
    $('#chat-messages').append(element);
    element.scrollIntoView({block:'nearest'});
    return element;
}
function resetChat(){
    if(chatBusy)return;
    chatHistory=[];
    $('#chat-messages').replaceChildren();
    addChatMessage('bot',chatWelcome,'Asystent CityReport');
    $('#chat-status').textContent='Przy każdym pytaniu pobieram aktualne dane wszystkich zgłoszeń.';
    $('#chat-input').focus();
}
async function sendChat(message){
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
    const pending=addChatMessage('bot','Analizuję aktualne zgłoszenia…','Asystent CityReport');
    $('#chat-messages').setAttribute('aria-busy','true');
    try{
        const response=await api('/api/ai/chat',{message:question,history:chatHistory.slice(-12)});
        const result=await response.json();
        if(!response.ok)throw new Error(result.error||'Nie udało się uzyskać odpowiedzi.');
        if(typeof result.answer!=='string'||!result.answer.trim())throw new Error('Model nie zwrócił odpowiedzi. Spróbuj ponownie.');
        pending.remove();
        addChatMessage('bot',result.answer,`Asystent • ${result.model}`);
        chatHistory.push({role:'user',content:question},{role:'assistant',content:result.answer.slice(0,6000)});
        chatHistory=chatHistory.slice(-12);
        $('#chat-status').textContent=`Analizowane zgłoszenia: ${result.report_count}. Dane z ${new Date(result.context_updated_at).toLocaleString('pl-PL')}.`;
    }catch(error){
        pending.remove();
        addChatMessage('bot',`${error.message} Możesz ponowić pytanie.`, 'Nie udało się odpowiedzieć');
        input.value=question;
    }finally{
        chatBusy=false;
        $('#chat-messages').setAttribute('aria-busy','false');
        $$('#chat-form button,[data-chat-prompt],#chat-reset').forEach(button=>button.disabled=false);
        input.disabled=false;
        input.focus();
    }
}
$('#chat-form').onsubmit=event=>{event.preventDefault();sendChat($('#chat-input').value)};
$$('[data-chat-prompt]').forEach(button=>button.onclick=()=>sendChat(button.dataset.chatPrompt));
$('#chat-reset').onclick=resetChat;
load();
