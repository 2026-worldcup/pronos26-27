(() => {
  'use strict';

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let ppmCache = null;
  let refreshTimer = null;

  function updateHeader() {
    const title = document.querySelector('.logo-area h1');
    const subtitle = document.querySelector('.logo-area .subtitle');
    if (title) title.innerHTML = 'Pronos <span class="accent">2027</span>';
    if (subtitle && Array.isArray(COMPETITIONS) && COMPETITIONS.length) {
      subtitle.textContent = COMPETITIONS.map(c => c.name).join(' · ');
    }
    document.title = 'Pronos 2027';
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
        const exact = Number(m.score1) === Number(p.predicted_score1) && Number(m.score2) === Number(p.predicted_score2);
        if (exact) points = 5;
        else {
          const actual = Math.sign(Number(m.score1) - Number(m.score2));
          const pred = Math.sign(Number(p.predicted_score1) - Number(p.predicted_score2));
          if (actual === pred) {
            const sameDiff = (Number(m.score1) - Number(m.score2)) === (Number(p.predicted_score1) - Number(p.predicted_score2));
            points = sameDiff ? 3 : 2;
          }
        }
      }
      const item = totals.get(pseudo) || { points: 0, matches: 0 };
      item.points += points;
      item.matches += 1;
      totals.set(pseudo, item);
    }
    const result = {};
    totals.forEach((v, k) => { result[k] = v.matches ? v.points / v.matches : 0; });
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

  async function refreshPPM() {
    ppmCache = await loadPointsPerMatch();
    applyRows();
  }

  function startRankingEnhancement() {
    const tbody = document.getElementById('leaderboard-tbody');
    if (!tbody) return;
    const observer = new MutationObserver(() => applyRows());
    observer.observe(tbody, { childList: true, subtree: true });
    refreshPPM();
    clearInterval(refreshTimer);
    refreshTimer = setInterval(refreshPPM, 30000);
  }

  async function removeNotificationSystem() {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch (e) {
      console.warn('Nettoyage notifications:', e);
    }
  }

  async function init() {
    await sleep(50);
    updateHeader();
    await removeNotificationSystem();
    startRankingEnhancement();
    setInterval(updateHeader, 2000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
