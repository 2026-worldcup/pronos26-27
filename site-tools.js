/* Outils d'interface : actualisation forcée + restauration de position. */
(() => {
    const POSITION_KEY = 'pronos26_scroll_position_v2';

    function savePosition() {
        try {
            sessionStorage.setItem(POSITION_KEY, JSON.stringify({ x: window.scrollX, y: window.scrollY }));
        } catch (_) {}
    }

    function restorePosition() {
        try {
            const raw = sessionStorage.getItem(POSITION_KEY);
            if (!raw) return;
            const pos = JSON.parse(raw);
            if (!Number.isFinite(pos.y)) return;

            let attempts = 0;
            const restore = () => {
                window.scrollTo(pos.x || 0, pos.y);
                attempts++;
                if (attempts < 15 && Math.abs(window.scrollY - pos.y) > 8) {
                    requestAnimationFrame(restore);
                } else {
                    sessionStorage.removeItem(POSITION_KEY);
                }
            };
            requestAnimationFrame(restore);
        } catch (_) {}
    }

    function createRefreshButton(logoutButton) {
        const button = logoutButton.cloneNode(true);
        button.id = 'hard-refresh';
        button.type = 'button';
        button.title = "Actualiser le site sans utiliser le cache";
        button.setAttribute('aria-label', 'Actualiser le site');
        button.innerHTML = `
            <svg class="refresh-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 11a8.1 8.1 0 0 0-14.9-3L3 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M3 5v6h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M4 13a8.1 8.1 0 0 0 14.9 3L21 13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M21 19v-6h-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Actualiser</span>`;

        button.addEventListener('click', async () => {
            button.disabled = true;
            button.classList.add('refreshing');
            const label = button.querySelector('span');
            if (label) label.textContent = 'Actualisation…';
            savePosition();

            try {
                if ('caches' in window) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map(key => caches.delete(key)));
                }
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(registrations.map(reg => reg.unregister()));
                }
            } catch (_) {}

            const url = new URL(window.location.href);
            url.searchParams.set('_refresh', Date.now());
            window.location.replace(url.href);
        });

        return button;
    }

    function install() {
        if (document.getElementById('hard-refresh')) return;

        const buttons = [...document.querySelectorAll('button, a')];
        const logoutButton = buttons.find(el => el.textContent.trim().toLowerCase().includes('déconnexion'));
        if (!logoutButton) return;

        const refreshButton = createRefreshButton(logoutButton);
        refreshButton.classList.add('site-refresh-button');
        logoutButton.parentNode.insertBefore(refreshButton, logoutButton);

        const style = document.createElement('style');
        style.textContent = `
            #hard-refresh {
                position: relative;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 9px;
                min-width: 150px;
                cursor: pointer;
                font: inherit;
            }
            #hard-refresh .refresh-icon {
                width: 19px;
                height: 19px;
                flex: 0 0 19px;
                transition: transform .45s cubic-bezier(.22,1,.36,1);
            }
            #hard-refresh:hover .refresh-icon { transform: rotate(180deg); }
            #hard-refresh.refreshing .refresh-icon { animation: site-refresh-spin .7s linear infinite; }
            #hard-refresh:disabled { cursor: wait; opacity: .72; }
            @keyframes site-refresh-spin { to { transform: rotate(360deg); } }
            @media (max-width: 640px) {
                #hard-refresh { min-width: 0; padding-left: 18px !important; padding-right: 18px !important; }
                #hard-refresh span { display: inline; }
            }
        `;
        document.head.appendChild(style);
    }

    window.addEventListener('scroll', savePosition, { passive: true });
    window.addEventListener('pagehide', savePosition);
    window.addEventListener('load', restorePosition, { once: true });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', install, { once: true });
    } else {
        install();
    }
})();
