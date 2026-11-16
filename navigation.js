(() => {
    const routes = [
        ['/', 'Home'], ['/unity/', '1. Unity Protocol'], ['/varis/', '2. Varis OS'],
        ['/V-Shelves/', '3. V-Shelves'], ['/heychef/', '4. Hey Chef'], ['/resort/', '5. The Resort'],
        ['/transparency/', '6. Institutional Risk & Disclosure'],
        ['/ubooks-terminal/', '7. Unity Books Demo'], ['/legal/', '8. Legal']
    ];
    const normalize = path => path.replace(/index\.html$/, '').replace(/\/$/, '').toLowerCase() || '/';
    const current = normalize(location.pathname);
    function links(container, footer) {
        container.replaceChildren(...routes.map(([href, title]) => {
            const link = document.createElement('a');
            link.href = href;
            link.textContent = title;
            link.className = 'text-xs font-bold uppercase tracking-widest hover:text-brand-gold';
            if (normalize(href) === current) {
                link.setAttribute('aria-current', 'page');
                link.classList.add('text-brand-gold', 'underline', 'underline-offset-8');
            } else if (footer || current !== '/') link.classList.add('text-slate-300');
            return link;
        }));
    }
    const menu = document.getElementById('menu');
    if (menu) {
        links(menu, false);
        menu.style.maxHeight = 'calc(100dvh - 7rem)';
        menu.style.overflowY = 'auto';
        menu.style.maxWidth = 'calc(100vw - 1rem)';
    }
    const footer = document.querySelector('[data-footer-navigation]');
    if (footer) links(footer, true);
    const button = document.getElementById('menu-btn');
    if (button && menu) {
        button.setAttribute('aria-label', 'Toggle navigation');
        button.setAttribute('aria-controls', 'menu');
        const sync = () => button.setAttribute('aria-expanded', String(!menu.classList.contains('hidden')));
        new MutationObserver(sync).observe(menu, { attributes: true, attributeFilter: ['class'] });
        sync();
        document.addEventListener('keydown', event => {
            if (event.key !== 'Escape' || menu.classList.contains('hidden')) return;
            menu.classList.add('hidden');
            menu.classList.remove('flex');
            document.getElementById('menu-icon')?.setAttribute('d', 'M4 6h16M4 12h16M4 18h16');
            button.focus();
        });
    }
})();
