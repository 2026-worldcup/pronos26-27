/* Ligue des Nations — séparation Ligue A / Ligue B. */
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
            const divisionMatches = allMatches.filter(m => m.competition === 'LDN' && m.division === currentDivision);
            if (subEl) subEl.innerText = `${divisionMatches.length} match${divisionMatches.length > 1 ? 's' : ''} · ${divisionLabel(currentDivision)}`;
            const matches = hideFinishedMatches.LDN ? divisionMatches.filter(m => getMatchStatus(m) !== 'done') : divisionMatches;
            if (!matches.length) {
                container.innerHTML = `<p class="empty-note">Aucun match programmé pour la ${divisionLabel(currentDivision)} pour le moment.</p>`;
                renderLdnMissingBanner();
                return;
            }
            const sorted = [...matches].sort((a, b) => new Date(a.match_date) - new Date(b.match_date) || (a.order_index - b.order_index));
            const phases = [], phaseIndex = {};
            sorted.forEach(m => {
                const key = m.phase || 'Matchs';
                if (!(key in phaseIndex)) { phaseIndex[key] = phases.length; phases.push({ label: key, matches: [] }); }
                phases[phaseIndex[key]].matches.push(m);
            });
            container.innerHTML = phases.map(phase => `<div class="card"><div class="phase-title">${escapeHTML(phase.label)}</div>${phase.matches.map(m => renderMatchRowHTML(m)).join('')}</div>`).join('');
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
            switcher.setAttribute('role', 'tablist');
            switcher.setAttribute('aria-label', 'Niveau de la Ligue des Nations');
            switcher.innerHTML = `<span class="ldn-slider" aria-hidden="true"></span><button type="button" role="tab" aria-selected="false" data-division="A" class="ldn-division-btn">Ligue A</button><button type="button" role="tab" aria-selected="false" data-division="B" class="ldn-division-btn">Ligue B</button>`;
            const buttons = switcher.querySelectorAll('.ldn-division-btn');
            buttons.forEach(btn => btn.addEventListener('click', () => {
                currentDivision = btn.dataset.division;
                localStorage.setItem('pronos26_ldn_division', currentDivision);
                buttons.forEach(b => {
                    const active = b === btn;
                    b.classList.toggle('active', active);
                    b.setAttribute('aria-selected', active ? 'true' : 'false');
                });
                switcher.classList.toggle('division-b', currentDivision === 'B');
                renderLdn();
                updateLdnBadge();
            }));
            header.insertBefore(switcher, header.firstChild);
            buttons.forEach(b => {
                const active = b.dataset.division === currentDivision;
                b.classList.toggle('active', active);
                b.setAttribute('aria-selected', active ? 'true' : 'false');
            });
            switcher.classList.toggle('division-b', currentDivision === 'B');
        }

        window.buildNavTabs = function() { originalBuildNavTabs(); rebuildLdnControls(); };
        window.renderCompetition = function(code) { if (code === 'LDN') renderLdn(); else originalRenderCompetition(code); };

        const style = document.createElement('style');
        style.textContent = `
            .ldn-division-switcher { position:relative; display:inline-flex; align-items:center; padding:4px; gap:0; margin-right:auto; background:color-mix(in srgb,var(--bg-card) 88%,var(--border)); border:1px solid var(--border); border-radius:12px; box-shadow:var(--shadow); isolation:isolate; }
            .ldn-slider { position:absolute; z-index:-1; top:4px; bottom:4px; left:4px; width:calc(50% - 2px); border-radius:9px; background:var(--bg-body); box-shadow:0 2px 7px rgba(0,0,0,.16); transition:transform .3s cubic-bezier(.22,1,.36,1); }
            .ldn-division-switcher.division-b .ldn-slider { transform:translateX(100%); }
            .ldn-division-btn { position:relative; z-index:1; border:0; background:transparent; color:var(--text-muted); padding:8px 16px; min-width:88px; border-radius:9px; font:700 .76rem/1 inherit; letter-spacing:.01em; transition:color .18s ease; }
            .ldn-division-btn:hover { color:var(--text-main); }
            .ldn-division-btn:focus-visible { outline:2px solid var(--primary); outline-offset:2px; }
            .ldn-division-btn.active { color:var(--text-main); }
            @media (max-width:640px) { .ldn-division-switcher { width:100%; margin:2px 0 6px; } .ldn-division-btn { flex:1; } }
        `;
        document.head.appendChild(style);
        rebuildLdnControls();
        renderLdn();
        updateLdnBadge();
        const originalUpdateMissingBadges = window.updateMissingBadges;
        if (originalUpdateMissingBadges) window.updateMissingBadges = function() { originalUpdateMissingBadges(); renderLdnMissingBanner(); updateLdnBadge(); };
    });
})();
