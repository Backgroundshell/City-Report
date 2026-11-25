(() => {
    const sidebar = document.querySelector('#app-sidebar');
    const content = document.querySelector('#sidebar-content');
    const toggle = document.querySelector('#sidebar-toggle');
    if (!sidebar || !content || !toggle) return;
    const label = toggle.querySelector('.sidebar-toggle-label');
    const storageKey = 'cityreport.sidebarCollapsed';

    function setCollapsed(collapsed, remember) {
        sidebar.hidden = false;
        content.hidden = collapsed;
        document.body.classList.toggle('sidebar-collapsed', collapsed);
        toggle.setAttribute('aria-expanded', String(!collapsed));
        const action = collapsed ? 'Rozwiń panel boczny' : 'Zwiń panel boczny';
        toggle.setAttribute('aria-label', action);
        toggle.title = action;
        label.textContent = collapsed ? 'Rozwiń panel' : 'Zwiń panel';
        if (remember) {
            try { localStorage.setItem(storageKey, String(collapsed)); } catch { /* Storage can be blocked. */ }
        }
        if (typeof window.ResizeObserver !== 'function') window.dispatchEvent(new Event('resize'));
    }

    let collapsed = false;
    try { collapsed = localStorage.getItem(storageKey) === 'true'; } catch { /* Keep navigation available. */ }
    setCollapsed(collapsed, false);
    toggle.addEventListener('click', () => setCollapsed(!content.hidden, true));
})();
