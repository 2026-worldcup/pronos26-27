/* Serie A — onglet et rendu dédié. */
(() => {
    window.addEventListener('load', () => {
        if (window.__serieAInstalled) return;
        window.__serieAInstalled = true;
        const CODE = 'SA';
        const NAME = 'Serie A';
        const originalBuildNavTabs = window.buildNavTabs;
        const originalRenderCompetition = window.renderCompetition;

        function ensureSection() {
            const wrap = document.getElementById('comp-sections');
            if (!wrap || document.getElementById('sec-SA')) return;
            const section = document.createElement('section');
            section.className = 'container';
            section.id = 'sec-SA';
            section.innerHTML = `<div class="comp-header"><div class="comp-header-left"><h2>${NAME}</h2><span class="comp-sub" id="comp-sub-SA"></span></div><button type="button" class="btn-toggle-finished" id="toggle-finished-SA" onclick="toggleFinishedMatches('SA')"><svg class="icon-eye" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg><svg class="icon-eye-off" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.6 21.6 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 5c7 0 11 7 11 7a21.6 21.6 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg><span id="toggle-finished-label-SA">Masquer terminés</span></button></div><div class="missing-pronos-banner" id="missing-banner-SA"></div><div class="phase-grid" id="phases-SA"></div>`;
            wrap.appendChild(section);
        }

        function ensureTab() {
            const nav = document.getElementById('nav-tabs');
            if (!nav || nav.querySelector('[data-section-id="SA"]')) return;
            const tab = document.createElement('button');
            tab.className = 'tab';
            tab.dataset.sectionId = CODE;
            tab.onclick = () => { showSection(CODE, tab); renderSerieA(); };
            tab.innerHTML = `${NAME}<span class="tab-missing-badge" id="missing-badge-SA" style="display:none">0</span>`;
            const pl = nav.querySelector('[data-section-id="PL"]');
            const leaderboard = nav.querySelector('[data-section-id="LEADERBOARD"]');
            if (pl && pl.nextSibling) nav.insertBefore(tab, pl.nextSibling);
            else nav.insertBefore(tab, leaderboard || null);
        }

        function renderSerieA() {
            const container = document.getElementById('phases-SA');
            const sub = document.getElementById('comp-sub-SA');
            if (!container) return;
            const matches = allMatches.filter(m => m.competition === CODE);
            if (sub) sub.innerText = `${matches.length} match${matches.length > 1 ? 's' : ''}`;
            if (!matches.length) { container.innerHTML = '<p class="empty-note">Aucun match programmé pour le moment.</p>'; return; }
            const visible = hideFinishedMatches.SA ? matches.filter(m => getMatchStatus(m) !== 'done') : matches;
            if (!visible.length) { container.innerHTML = '<p class="empty-note">Tous les matchs de cette compétition sont terminés.</p>'; return; }
            const sorted = [...visible].sort((a, b) => new Date(a.match_date) - new Date(b.match_date) || a.order_index - b.order_index);
            const phases = [];
            const phaseIndex = {};
            sorted.forEach(m => { const key = m.phase || 'Journée'; if (!(key in phaseIndex)) { phaseIndex[key] = phases.length; phases.push({ label: key, matches: [] }); } phases[phaseIndex[key]].matches.push(m); });
            container.innerHTML = phases.map(phase => `<div class="card"><div class="phase-title">${escapeHTML(phase.label)}</div>${phase.matches.map(m => renderMatchRowHTML(m)).join('')}</div>`).join('');
            renderSerieABadge();
        }

        function renderSerieABadge() {
            const badge = document.getElementById('missing-badge-SA');
            if (!badge || typeof getMissingPronosForComp !== 'function') return;
            const missing = getMissingPronosForComp(CODE);
            badge.innerText = missing.length;
            badge.style.display = missing.length ? 'inline-flex' : 'none';
        }

        window.buildNavTabs = function() { originalBuildNavTabs(); ensureSection(); ensureTab(); renderSerieA(); };
        window.renderCompetition = function(code) { if (code === CODE) renderSerieA(); else originalRenderCompetition(code); };

        const originalToggleFinished = window.toggleFinishedMatches;
        window.toggleFinishedMatches = function(code) {
            if (code === CODE) {
                hideFinishedMatches.SA = !hideFinishedMatches.SA;
                const hidden = hideFinishedMatches.SA;
                const btn = document.getElementById('toggle-finished-SA');
                const label = document.getElementById('toggle-finished-label-SA');
                if (btn) {
                    btn.classList.toggle('active', hidden);
                    const eye = btn.querySelector('.icon-eye');
                    const eyeOff = btn.querySelector('.icon-eye-off');
                    if (eye) eye.style.display = hidden ? 'none' : 'block';
                    if (eyeOff) eyeOff.style.display = hidden ? 'block' : 'none';
                }
                if (label) label.innerText = hidden ? 'Afficher terminés' : 'Masquer terminés';
                renderSerieA();
                return;
            }
            originalToggleFinished(code);
        };

        ensureSection();
        ensureTab();
        renderSerieA();
    });
})();
