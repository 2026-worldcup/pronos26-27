/* Ligue des Nations — séparation Ligue A / Ligue B.
   Couche d'extension isolée du legacy.html. */
(() => {
    window.addEventListener('load', () => {
        if (window.__ldnSplitInstalled) return;
        window.__ldnSplitInstalled = true;

        let currentDivision = localStorage.getItem('pronos26_ldn_division') || 'A';
        if (!['A', 'B'].includes(currentDivision)) currentDivision = 'A';

        const originalBuildNavTabs = window.buildNavTabs;
        const originalRenderCompetition = window.renderCompetition;

        const divisionLabel = d => d === 'A' ? 'Ligue A' : 'Ligue B';

        function renderLdn() {
            const container = document.getElementById('phases-LDN');
            const subEl = document.getElementById('comp-sub-LDN');
            if (!container) return;

            const allLdn = allMatches.filter(m => m.competition === 'LDN');
            const divisionMatches = allLdn.filter(m => m.division === currentDivision);
            if (subEl) subEl.innerText = `${divisionMatches.length} match${divisionMatches.length > 1 ? 's' : ''} · ${divisionLabel(currentDivision)}`;

            const matches = hideFinishedMatches.LDN
                ? divisionMatches.filter(m => getMatchStatus(m) !== 'done')
                : divisionMatches;

            if (!matches.length) {
                container.innerHTML = `<p class="empty-note">Aucun match programmé pour la ${divisionLabel(currentDivision)} pour le moment.</p>`;
                renderLdnMissingBanner();
                return;
            }

            const sorted = [...matches].sort((a, b) => new Date(a.match_date) - new Date(b.match_date) || (a.order_index - b.order_index));
            const phases = [];
            const phaseIndex = {};
            sorted.forEach(m => {
                const key = m.phase || 'Matchs';
                if (!(key in phaseIndex)) { phaseIndex[key] = phases.length; phases.push({ label: key, matches: [] }); }
                phases[phaseIndex[key]].matches.push(m);
            });

            container.innerHTML = phases.map(phase => `
                <div class="card">
                    <div class="phase-title">${escapeHTML(phase.label)}</div>
                    ${phase.matches.map(m => renderMatchRowHTML(m)).join('')}
                </div>`).join('');
            renderLdnMissingBanner();
        }

        function renderLdnMissingBanner() {
            const el = document.getElementById('missing-banner-LDN');
            if (!el) return;
            const session = getSession();
            if (!session) { el.style.display = 'none'; return; }
            const now = new Date(), in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
            const missing = allMatches.filter(m => m.competition === 'LDN' && m.division === currentDivision && new Date(m.match_date) > now && new Date(m.match_date) <= in48h && !myPronostics[m.id]);
            el.style.display = missing.length ? 'block' : 'none';
            el.innerText = missing.length ? `Votre pronostic manque pour ${missing.length} match${missing.length > 1 ? 's' : ''} de la ${divisionLabel(currentDivision)}.` : '';
        }

        function updateLdnBadge() {
            const badge = document.getElementById('missing-badge-LDN');
            if (!badge) return;
            const session = getSession();
            if (!session) { badge.style.display = 'none'; return; }
            const now = new Date(), in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
            const missing = allMatches.filter(m => m.competition === 'LDN' && m.division === currentDivision && new Date(m.match_date) > now && new Date(m.match_date) <= in48h && !myPronostics[m.id]).length;
            badge.innerText = missing;
            badge.style.display = missing ? 'inline-flex' : 'none';
        }

        function rebuildLdnControls() {
            const section = document.getElementById('sec-LDN');
            if (!section) return;
            const header = section.querySelector('.comp-header');
            if (!header || document.getElementById('ldn-division-switcher')) return;

            const switcher = document.createElement('div');
            switcher.id = 'ldn-division-switcher';
            switcher.className = 'ldn-division-switcher';
            switcher.innerHTML = `<span class="ldn-switch-label">Niveau</span><button type="button" data-division="A" class="ldn-division-btn">🇪🇺 Ligue A</button><button type="button" data-division="B" class="ldn-division-btn">🅱️ Ligue B</button>`;
            const buttons = switcher.querySelectorAll('.ldn-division-btn');
            buttons.forEach(btn => btn.addEventListener('click', () => {
                currentDivision = btn.dataset.division;
                localStorage.setItem('pronos26_ldn_division', currentDivision);
                buttons.forEach(b => b.classList.toggle('active', b === btn));
                renderLdn();
                updateLdnBadge();
            }));
            header.insertBefore(switcher, header.firstChild);
            buttons.forEach(b => b.classList.toggle('active', b.dataset.division === currentDivision));
        }

        window.buildNavTabs = function() {
            originalBuildNavTabs();
            rebuildLdnControls();
        };
        window.renderCompetition = function(code) {
            if (code === 'LDN') renderLdn();
            else originalRenderCompetition(code);
        };

        const style = document.createElement('style');
        style.textContent = `
            .ldn-division-switcher { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-right:auto; }
            .ldn-switch-label { font-size:.72rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-right:2px; }
            .ldn-division-btn { border:1px solid var(--border); background:var(--bg-card); color:var(--text-muted); padding:7px 12px; border-radius:999px; font:700 .74rem/1 inherit; box-shadow:var(--shadow); }
            .ldn-division-btn:hover { border-color:var(--primary); color:var(--text-main); }
            .ldn-division-btn.active { background:var(--primary); color:#fff; border-color:var(--primary); }
            body.dark-mode .ldn-division-btn.active { color:#061021; }
            @media (max-width:640px) { .ldn-division-switcher { width:100%; margin-bottom:4px; } .ldn-switch-label { width:100%; } }
        `;
        document.head.appendChild(style);

        rebuildLdnControls();
        renderLdn();
        updateLdnBadge();

        const originalUpdateMissingBadges = window.updateMissingBadges;
        if (originalUpdateMissingBadges) {
            window.updateMissingBadges = function() {
                originalUpdateMissingBadges();
                renderLdnMissingBanner();
                updateLdnBadge();
            };
        }
    });
})();
