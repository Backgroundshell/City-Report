(() => {
    const content = document.querySelector('#navigation-content');
    const toggle = document.querySelector('#navigation-toggle');
    if (!content || !toggle) return;
    const compact = window.matchMedia('(max-width: 1050px)');
    const label = toggle.querySelector('span');
    let expanded = false;

    function render() {
        const open = !compact.matches || expanded;
        const restoreFocus = !open && content.contains(document.activeElement);
        content.hidden = !open;
        toggle.setAttribute('aria-expanded', String(open));
        const action = open ? 'Zamknij menu nawigacji' : 'Otwórz menu nawigacji';
        toggle.setAttribute('aria-label', action);
        toggle.title = action;
        label.textContent = compact.matches && expanded ? 'Zamknij menu' : 'Menu';
        if (restoreFocus) toggle.focus();
    }

    function close() {
        expanded = false;
        render();
    }

    toggle.addEventListener('click', () => {
        expanded = !expanded;
        render();
    });
    compact.addEventListener('change', close);
    content.addEventListener('click', event => {
        if (compact.matches && event.target.closest('[data-view], [data-action]')) close();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && compact.matches && expanded) {
            event.preventDefault();
            close();
            toggle.focus();
        }
    });
    window.addEventListener('hashchange', close);
    render();
})();
