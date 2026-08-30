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

    function createRefreshButton() {
        const button = document.createElement('button');
        button.id = 'hard-refresh';
        button.type = 'button';
        button.title = 'Actualiser le site sans utiliser le cache';
        button.setAttribute('aria-label', 'Actualiser le site');
        button.innerHTML = `
            <svg class="refresh-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 11a8.1 8.1 0 0 0-14.9-3L3 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M3 5v6h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M4 13a8.1 8.1 0 0 0 14.9 3L21 13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M21 19v-6h-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Actualiser</span>`;

        button.addEventListener('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();
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

        const header = document.querySelector('.header');
        const authBar = document.querySelector('.auth-bar');
        if (!header || !authBar) return;

        const refreshRow = document.createElement('div');
        refreshRow.className = 'site-refresh-row';
        refreshRow.appendChild(createRefreshButton());
        header.insertBefore(refreshRow, authBar);

        const style = document.createElement('style');
        style.textContent = `
            .site-refresh-row {
                display: flex;
                justify-content: flex-end;
                align-items: center;
                margin-top: -2px;
                margin-bottom: -3px;
            }
            #hard-refresh {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                min-height: 34px;
                padding: 6px 14px;
                background: transparent;
                border: 1px solid rgba(255,255,255,.4);
                color: #fff;
                border-radius: 20px;
                font: 600 .78rem/1 'Montserrat', system-ui, sans-serif;
                transition: background-color .2s ease, border-color .2s ease, transform .2s ease, opacity .2s ease;
            }
            #hard-refresh:hover {
                background: rgba(255,255,255,.08);
                border-color: rgba(255,255,255,.65);
                transform: translateY(-1px);
            }
            #hard-refresh:active { transform: translateY(0) scale(.98); }
            #hard-refresh .refresh-icon {
                width: 17px;
                height: 17px;
                flex: 0 0 17px;
                transition: transform .45s cubic-bezier(.22,1,.36,1);
            }
            #hard-refresh:hover .refresh-icon { transform: rotate(180deg); }
            #hard-refresh.refreshing .refresh-icon { animation: site-refresh-spin .7s linear infinite; }
            #hard-refresh:disabled { cursor: wait; opacity: .72; }
            @keyframes site-refresh-spin { to { transform: rotate(360deg); } }
            @media (max-width: 640px) {
                .site-refresh-row { justify-content: flex-start; }
                #hard-refresh { padding-left: 13px; padding-right: 13px; }
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