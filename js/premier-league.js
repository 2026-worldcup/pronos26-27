/* Premier League — onglet et rendu dédié. */
(() => {
    window.addEventListener('load', () => {
        if (window.__premierLeagueInstalled) return;
        window.__premierLeagueInstalled = true;
        const PL_CODE = 'PL';
        const PL_NAME = 'Premier League';
        const originalBuildNavTabs = window.buildNavTabs;
        const originalRenderCompetition = window.renderCompetition;

        function ensureSection() {
            const wrap = document.getElementById('comp-sections');
            if (!wrap || document.getElementById('sec-PL')) return;
            const section = document.createElement('section');
            section.className = 'container';
            section.id = 'sec-PL';
            section.innerHTML = `<div class="comp-header"><div class="comp-header-left"><h2>${PL_NAME}</h2><span class="comp-sub" id="comp-sub-PL"></span></div><button type="button" class="btn-toggle-finished" id="toggle-finished-PL" onclick="toggleFinishedMatches('PL')"><svg class="icon-eye" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg><svg class="icon-eye-off" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none;"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.6 21.6 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 5c7 0 11 7 11 7a21.6 21.6 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg><span id="toggle-finished-label-PL">Masquer terminés</span></button></div><div class="missing-pronos-banner" id="missing-banner-PL"></div><div class="phase-grid" id="phases-PL"></div>`;
            wrap.appendChild(section);
        }

        function ensureTab() {
            const nav = document.getElementById('nav-tabs');
            if (!nav || nav.querySelector('[data-section-id="PL"]')) return;
            const tab = document.createElement('button');
            tab.className = 'tab';
            tab.dataset.sectionId = PL_CODE;
            tab.onclick = () => { showSection(PL_CODE, tab); renderPremierLeague(); };
            tab.innerHTML = `${PL_NAME}<span class="tab-missing-badge" id="missing-badge-PL" style="display:none;">0</span>`;
            const leaderboard = nav.querySelector('[data-section-id="LEADERBOARD"]');
            nav.insertBefore(tab, leaderboard || null);
        }

        function renderPremierLeague() {
            const container = document.getElementById('phases-PL');
            const sub = document.getElementById('comp-sub-PL');
            if (!container) return;
            const matches = allMatches.filter(m => m.competition === PL_CODE);
            if (sub) sub.innerText = `${matches.length} match${matches.length > 1 ? 's' : ''}`;
            if (!matches.length) { container.innerHTML = '<p class="empty-note">Aucun match programmé pour le moment.</p>'; return; }
            const visible = hideFinishedMatches.PL ? matches.filter(m => getMatchStatus(m) !== 'done') : matches;
            if (!visible.length) { container.innerHTML = '<p class="empty-note">Tous les matchs de cette compétition sont terminés.</p>'; return; }
            const sorted = [...visible].sort((a, b) => new Date(a.match_date) - new Date(b.match_date) || a.order_index - b.order_index);
            const phases = [];
            const phaseIndex = {};
            sorted.forEach(m => { const key = m.phase || 'Journée'; if (!(key in phaseIndex)) { phaseIndex[key] = phases.length; phases.push({ label: key, matches: [] }); } phases[phaseIndex[key]].matches.push(m); });
            container.innerHTML = phases.map(phase => `<div class="card"><div class="phase-title">${escapeHTML(phase.label)}</div>${phase.matches.map(m => renderMatchRowHTML(m)).join('')}</div>`).join('');
            renderPremierLeagueBadge();
        }

        function renderPremierLeagueBadge() {
            const badge = document.getElementById('missing-badge-PL');
            if (!badge) return;
            const missing = getMissingPronosForComp(PL_CODE);
            badge.innerText = missing.length;
            badge.style.display = missing.length ? 'inline-flex' : 'none';
        }

        window.buildNavTabs = function() { originalBuildNavTabs(); ensureSection(); ensureTab(); renderPremierLeague(); };
        window.renderCompetition = function(code) { if (code === PL_CODE) renderPremierLeague(); else originalRenderCompetition(code); };

        const originalToggleFinished = window.toggleFinishedMatches;
        window.toggleFinishedMatches = function(code) {
            if (code === PL_CODE) {
                hideFinishedMatches.PL = !hideFinishedMatches.PL;
                const hidden = hideFinishedMatches.PL;
                const btn = document.getElementById('toggle-finished-PL');
                const label = document.getElementById('toggle-finished-label-PL');
                if (btn) {
                    btn.classList.toggle('active', hidden);
                    const eye = btn.querySelector('.icon-eye');
                    const eyeOff = btn.querySelector('.icon-eye-off');
                    if (eye) eye.style.display = hidden ? 'none' : 'block';
                    if (eyeOff) eyeOff.style.display = hidden ? 'block' : 'none';
                }
                if (label) label.innerText = hidden ? 'Afficher terminés' : 'Masquer terminés';
                renderPremierLeague();
                return;
            }
            originalToggleFinished(code);
        };

        ensureSection();
        ensureTab();
        renderPremierLeague();
    });
})();
