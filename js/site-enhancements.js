(() => {
  'use strict';

  let ppmCache = null;
  let refreshStarted = false;
  let applyScheduled = false;

  // Header volontairement statique : il ne dépend pas de COMPETITIONS.
  function updateHeader() {
    const title = document.querySelector('.logo-area h1');
    const subtitle = document.querySelector('.logo-area .subtitle');
    if (title) title.innerHTML = 'Pronos <span class="accent">2026-2027</span>';
    if (subtitle) subtitle.textContent = 'Ligue 1 · Ligue des Champions · Ligue des Nations · Premier League · Serie A';
    document.title = 'Pronos 2026-2027';
  }

  async function loadPointsPerMatch() {
    if (typeof supabaseClient === 'undefined') return {};

    const [{ data: pronostics, error: pError }, { data: matches, error: mError }] = await Promise.all([
      supabaseClient.from('pronostics').select('pseudo, match_id, predicted_score1, predicted_score2'),
      supabaseClient.from('matches').select('id, score1, score2')
    ]);

    if (pError || mError) {
      console.error('Points par match:', pError || mError);
      return {};
    }

    const byMatch = new Map((matches || []).map(m => [String(m.id), m]));
    const totals = new Map();

    for (const p of (pronostics || [])) {
      const pseudo = String(p.pseudo || '');
      if (!pseudo) continue;

      const m = byMatch.get(String(p.match_id));
      let points = 0;

      if (m && m.score1 !== null && m.score1 !== undefined && m.score2 !== null && m.score2 !== undefined) {
        const score1 = Number(m.score1);
        const score2 = Number(m.score2);
        const pred1 = Number(p.predicted_score1);
        const pred2 = Number(p.predicted_score2);

        if (score1 === pred1 && score2 === pred2) {
          points = 5;
        } else if (Math.sign(score1 - score2) === Math.sign(pred1 - pred2)) {
          points = (score1 - score2) === (pred1 - pred2) ? 3 : 2;
        }
      }

      const item = totals.get(pseudo) || { points: 0, matches: 0 };
      item.points += points;
      item.matches += 1;
      totals.set(pseudo, item);
    }

    const result = {};
    totals.forEach((v, k) => {
      result[k] = v.matches ? v.points / v.matches : 0;
    });
    return result;
  }

  function formatPPM(value) {
    return Number.isFinite(value) ? value.toFixed(2).replace('.', ',') : '0,00';
  }

  function ensureHeader() {
    const head = document.querySelector('table.leaderboard-table thead tr');
    if (!head || head.querySelector('[data-points-per-match]')) return;

    const th = document.createElement('th');
    th.dataset.pointsPerMatch = '1';
    th.textContent = 'Points / match';
    th.style.textAlign = 'center';
    head.insertBefore(th, head.children[2] || null);
  }

  function applyRows() {
    const tbody = document.getElementById('leaderboard-tbody');
    if (!tbody || !ppmCache) return;

    ensureHeader();
    tbody.querySelectorAll('tr').forEach(row => {
      const pseudoEl = row.querySelector('.pseudo-link');
      if (!pseudoEl) return;

      const pseudo = pseudoEl.textContent.trim();
      const value = ppmCache[pseudo] ?? 0;
      let cell = row.querySelector('[data-points-per-match-cell]');

      if (!cell) {
        cell = document.createElement('td');
        cell.dataset.pointsPerMatchCell = '1';
        cell.style.textAlign = 'center';
        const pointCell = row.children[2];
        row.insertBefore(cell, pointCell || null);
      }
      cell.textContent = formatPPM(value);
    });
  }

  function scheduleApplyRows() {
    if (applyScheduled) return;
    applyScheduled = true;
    requestAnimationFrame(() => {
      applyScheduled = false;
      applyRows();
    });
  }

  async function refreshPPM() {
    if (refreshStarted) return;
    refreshStarted = true;
    ppmCache = await loadPointsPerMatch();
    scheduleApplyRows();
  }

  function startRankingEnhancement() {
    const tbody = document.getElementById('leaderboard-tbody');
    if (!tbody) return;

    const observer = new MutationObserver(scheduleApplyRows);
    observer.observe(tbody, { childList: true, subtree: true });

    // Une seule lecture de Supabase au chargement, au lieu d'une requête toutes les 30 s.
    // Le calcul est différé pour laisser le rendu initial de la page respirer.
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => refreshPPM(), { timeout: 3000 });
    } else {
      setTimeout(refreshPPM, 1200);
    }
  }

  function init() {
    updateHeader();
    startRankingEnhancement();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
