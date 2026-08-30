/* ============================================================
   PRONOS 2026 — Statistiques et historique de profil
   - Statistiques cohérentes avec les résultats terminés
   - Forme récente = 5 derniers matchs terminés uniquement
   - Codes visuels : rouge = manqué, bleu = bonne issue,
     rose = bon écart, doré animé = exact
   ============================================================ */
(() => {
  'use strict';

  const PROFILE_STATS_STYLE_ID = 'profile-stats-v2-styles';

  function escape(value) {
    if (typeof escapeHTML === 'function') return escapeHTML(value);
    const div = document.createElement('div');
    div.textContent = String(value ?? '');
    return div.innerHTML;
  }

  function isFinished(match) {
    return !!match && match.score1 !== null && match.score1 !== undefined && match.score2 !== null && match.score2 !== undefined;
  }

  function classifyPrediction(match, prediction) {
    if (!isFinished(match)) return 'pending';

    const exact = match.score1 === prediction.predicted_score1 && match.score2 === prediction.predicted_score2;
    if (exact) return 'exact';

    const actualSign = Math.sign(match.score1 - match.score2);
    const predictedSign = Math.sign(prediction.predicted_score1 - prediction.predicted_score2);
    if (actualSign !== predictedSign) return 'miss';

    const actualDiff = match.score1 - match.score2;
    const predictedDiff = prediction.predicted_score1 - prediction.predicted_score2;
    return actualDiff === predictedDiff ? 'diff' : 'issue';
  }

  function classificationLabel(type) {
    return {
      exact: '🎯 Exact · +5',
      diff: '📐 Bon écart · +3',
      issue: '✓ Bonne issue · +2',
      miss: '✕ Manqué · 0',
      pending: '⏳ En attente'
    }[type] || '⏳ En attente';
  }

  function classificationShortLabel(type) {
    return {
      exact: 'Exact',
      diff: 'Bon écart',
      issue: 'Bonne issue',
      miss: 'Manqué',
      pending: 'En attente'
    }[type] || 'En attente';
  }

  function sortPredictions(predictions) {
    return [...predictions].sort((a, b) => {
      const ma = allMatches.find(x => x.id === a.match_id);
      const mb = allMatches.find(x => x.id === b.match_id);
      const da = new Date(ma?.match_date || a.created_at || 0).getTime();
      const db = new Date(mb?.match_date || b.created_at || 0).getTime();
      return db - da;
    });
  }

  function calculateProfileStats(predictions) {
    const stats = { total: predictions.length, exact: 0, diff: 0, issue: 0, miss: 0 };
    predictions.forEach(prediction => {
      const match = allMatches.find(x => x.id === prediction.match_id);
      const type = classifyPrediction(match, prediction);
      if (type === 'exact') stats.exact++;
      else if (type === 'diff') stats.diff++;
      else if (type === 'issue') stats.issue++;
      else if (type === 'miss') stats.miss++;
    });
    return stats;
  }

  function renderRecentForm(predictions) {
    const finished = sortPredictions(predictions).filter(prediction => {
      const match = allMatches.find(x => x.id === prediction.match_id);
      return isFinished(match);
    }).slice(0, 5);

    if (!finished.length) return '<span class="profile-form-empty">Aucun match terminé</span>';

    return `<div class="profile-form-dots-v2">${finished.map((prediction, index) => {
      const match = allMatches.find(x => x.id === prediction.match_id);
      const type = classifyPrediction(match, prediction);
      return `<span class="profile-form-dot-v2 ${type}" title="${escape(classificationShortLabel(type))}" aria-label="${escape(classificationShortLabel(type))}"><span></span></span>`;
    }).join('')}</div>`;
  }

  function renderHistory(predictions) {
    const sorted = sortPredictions(predictions);
    if (!sorted.length) return '<p class="desc">Aucun pronostic pour le moment.</p>';

    return sorted.map(prediction => {
      const match = allMatches.find(x => x.id === prediction.match_id);
      if (!match) return '';
      const type = classifyPrediction(match, prediction);
      const real = isFinished(match) ? `Résultat : ${match.score1}-${match.score2}` : 'Résultat à venir';
      return `<article class="profile-prediction-card-v2">
        <div class="profile-prediction-top-v2">
          <div class="profile-prediction-match-v2">
            <strong>${escape(match.team1)} <span>vs</span> ${escape(match.team2)}</strong>
            <small>${escape(match.phase || '')} · ${escape(typeof formatDate === 'function' ? formatDate(match.match_date) : new Date(match.match_date).toLocaleString('fr-FR'))}</small>
          </div>
          <span class="profile-prediction-score-v2">${prediction.predicted_score1} - ${prediction.predicted_score2}</span>
        </div>
        <div class="profile-prediction-bottom-v2">
          <span class="profile-result-badge-v2 ${type}">${classificationLabel(type)}</span>
          <span class="profile-prediction-real-v2">${escape(real)}</span>
        </div>
      </article>`;
    }).join('');
  }

  function ensureHistoryModal() {
    if (document.getElementById('profile-history-modal-v2')) return;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay profile-history-modal';
    modal.id = 'profile-history-modal-v2';
    modal.innerHTML = `<div class="modal-box profile-history-modal-box profile-history-modal-v2-box">
      <div class="modal-header">
        <h3 id="profile-history-modal-v2-title">Historique des pronostics</h3>
        <button type="button" class="modal-close" id="profile-history-modal-v2-close" aria-label="Fermer">✕</button>
      </div>
      <div id="profile-history-modal-v2-body"></div>
    </div>`;
    document.body.appendChild(modal);
    document.getElementById('profile-history-modal-v2-close').addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', event => { if (event.target === modal) modal.style.display = 'none'; });
  }

  function openHistoryModalV2(pseudo, historyHtml) {
    ensureHistoryModal();
    document.getElementById('profile-history-modal-v2-title').textContent = `Historique de ${pseudo}`;
    document.getElementById('profile-history-modal-v2-body').innerHTML = historyHtml;
    document.getElementById('profile-history-modal-v2').style.display = 'flex';
  }

  function installStyles() {
    if (document.getElementById(PROFILE_STATS_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = PROFILE_STATS_STYLE_ID;
    style.textContent = `
      .profile-stat-grid-v2 { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; margin:16px 0 12px; }
      .profile-stat-card-v2 { min-height:74px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; border:1px solid var(--border); border-radius:14px; background:var(--bg-card); box-shadow:0 4px 12px rgba(15,37,87,.06); }
      .profile-stat-value-v2 { font-size:1.25rem; line-height:1; font-weight:900; color:var(--text-main); }
      .profile-stat-label-v2 { font-size:.66rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; }
      .profile-form-strip-v2 { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:13px 14px; border:1px solid var(--border); border-radius:14px; background:var(--bg-card); }
      .profile-form-title-v2 { font-size:.8rem; font-weight:900; }
      .profile-form-dots-v2 { display:flex; align-items:center; gap:7px; flex:0 0 auto; }
      .profile-form-dot-v2 { width:25px; height:25px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; position:relative; box-sizing:border-box; }
      .profile-form-dot-v2 span { width:9px; height:9px; border-radius:50%; background:rgba(255,255,255,.9); box-shadow:0 1px 3px rgba(0,0,0,.12); }
      .profile-form-dot-v2.miss { background:#ef4444; }
      .profile-form-dot-v2.issue { background:#3b82f6; }
      .profile-form-dot-v2.diff { background:#ec78ad; }
      .profile-form-dot-v2.exact { background:linear-gradient(135deg,#fff4a3,#facc15,#fff8c4,#f59e0b); box-shadow:0 0 0 2px rgba(250,204,21,.18),0 0 16px rgba(250,204,21,.55); animation:profileExactPulse 1.8s ease-in-out infinite; }
      .profile-form-empty { color:var(--text-muted); font-size:.68rem; font-weight:700; }
      @keyframes profileExactPulse { 0%,100% { transform:scale(1); filter:brightness(1); } 50% { transform:scale(1.08); filter:brightness(1.14); } }
      .profile-prediction-card-v2 { padding:12px; border:1px solid var(--border); border-radius:13px; background:var(--bg-card); margin-bottom:8px; }
      .profile-prediction-top-v2,.profile-prediction-bottom-v2 { display:flex; align-items:center; justify-content:space-between; gap:12px; }
      .profile-prediction-match-v2 { min-width:0; display:flex; flex-direction:column; gap:4px; }
      .profile-prediction-match-v2 strong { font-size:.78rem; overflow-wrap:anywhere; }
      .profile-prediction-match-v2 strong span { color:var(--text-muted); font-weight:600; }
      .profile-prediction-match-v2 small,.profile-prediction-real-v2 { color:var(--text-muted); font-size:.64rem; }
      .profile-prediction-score-v2 { flex:0 0 auto; font-size:.85rem; font-weight:900; }
      .profile-prediction-bottom-v2 { margin-top:9px; }
      .profile-result-badge-v2 { display:inline-flex; align-items:center; min-height:23px; padding:4px 8px; border-radius:999px; color:#fff; font-size:.63rem; line-height:1; font-weight:900; white-space:nowrap; }
      .profile-result-badge-v2.miss { background:#ef4444; }
      .profile-result-badge-v2.issue { background:#3b82f6; }
      .profile-result-badge-v2.diff { background:#ec78ad; }
      .profile-result-badge-v2.exact { color:#5b4300; background:linear-gradient(135deg,#fff4a3,#facc15,#fff8c4,#f59e0b); box-shadow:0 0 10px rgba(250,204,21,.38); animation:profileExactBadge 1.8s ease-in-out infinite; }
      .profile-result-badge-v2.pending { background:#94a3b8; }
      @keyframes profileExactBadge { 0%,100% { box-shadow:0 0 7px rgba(250,204,21,.3); } 50% { box-shadow:0 0 15px rgba(250,204,21,.68); } }
      .profile-history-modal-v2-box { width:min(590px,calc(100vw - 24px)); max-height:min(88vh,780px); overflow:hidden; }
      #profile-history-modal-v2-body { overflow-y:auto; max-height:calc(min(88vh,780px) - 76px); padding-right:2px; }
      .profile-history-button-v2 { width:100%; margin-top:12px; }
      @media(max-width:520px){ .profile-form-strip-v2 { align-items:flex-start; flex-direction:column; } .profile-form-dots-v2 { align-self:flex-end; } .profile-prediction-bottom-v2 { align-items:flex-start; flex-direction:column; } }
    `;
    document.head.appendChild(style);
  }

  async function openProfileModalV2(pseudo) {
    const body = document.getElementById('profile-body');
    if (!body) return;
    document.getElementById('profile-title').innerText = pseudo;
    body.innerHTML = '<p class="desc">Chargement du profil...</p>';
    document.getElementById('profile-modal').style.display = 'flex';

    const [{ data: dbUser }, { data: predictions }] = await Promise.all([
      supabaseClient.from('public_users').select('pseudo, description, avatar').eq('pseudo', pseudo).maybeSingle(),
      supabaseClient.from('pronostics').select('*').eq('pseudo', pseudo)
    ]);

    const player = (typeof globalRankList !== 'undefined' ? globalRankList : []).find(p => p.pseudo === pseudo);
    const playerAvatar = dbUser?.avatar || player?.avatar || '⚽';
    const description = dbUser?.description?.trim() || '';
    const stats = calculateProfileStats(predictions || []);
    const rank = player?.rank ?? '—';
    const points = player?.totalPoints ?? (stats.exact * 5 + stats.diff * 3 + stats.issue * 2);
    const historyHtml = renderHistory(predictions || []);

    body.innerHTML = `<div class="profile-social-card">
      <div class="profile-cover"></div>
      <div class="profile-identity">
        <div class="profile-avatar-xl">${escape(playerAvatar)}</div>
        <div class="profile-username-xl">${escape(pseudo)}</div>
        <div class="profile-rank-line">🏆 #${escape(rank)} · ${points} points</div>
        <div class="profile-bio-box ${description ? '' : 'empty'}">${description ? `“${escape(description)}”` : 'Ce joueur n’a pas encore ajouté de description.'}</div>
      </div>
      <div class="profile-stat-grid-v2">
        <div class="profile-stat-card-v2"><span class="profile-stat-value-v2">${stats.total}</span><span class="profile-stat-label-v2">Pronostics</span></div>
        <div class="profile-stat-card-v2"><span class="profile-stat-value-v2">${stats.exact}</span><span class="profile-stat-label-v2">Pronostics exacts</span></div>
        <div class="profile-stat-card-v2"><span class="profile-stat-value-v2">${stats.diff}</span><span class="profile-stat-label-v2">Bons écarts</span></div>
        <div class="profile-stat-card-v2"><span class="profile-stat-value-v2">${stats.issue}</span><span class="profile-stat-label-v2">Bonnes issues</span></div>
      </div>
      <div class="profile-form-strip-v2">
        <div><div class="profile-form-title-v2">Forme récente</div><small class="desc">5 derniers matchs terminés · du plus récent au plus ancien</small></div>
        ${renderRecentForm(predictions || [])}
      </div>
      <div class="profile-history-section">
        <div class="profile-history-heading"><span class="profile-history-title">📜 Historique</span><span class="profile-history-count">${(predictions || []).length} pronostic${(predictions || []).length > 1 ? 's' : ''}</span></div>
        <button type="button" class="profile-history-button profile-history-button-v2">Voir tout l’historique <span>⌄</span></button>
      </div>
    </div>`;

    const historyButton = body.querySelector('.profile-history-button-v2');
    if (historyButton) historyButton.addEventListener('click', () => openHistoryModalV2(pseudo, historyHtml));

    const avatar = body.querySelector('.profile-avatar-xl');
    if (avatar && typeof supabaseClient !== 'undefined') {
      const { data: status } = await supabaseClient.from('public_users').select('status, status_expires_at').eq('pseudo', pseudo).maybeSingle();
      if (status?.status && status?.status_expires_at && new Date(status.status_expires_at) > new Date()) {
        const bubble = document.createElement('div');
        bubble.className = 'profile-status-bubble';
        bubble.textContent = status.status;
        avatar.appendChild(bubble);
      }
    }
  }

  function install() {
    installStyles();
    if (typeof window.openProfileModal === 'function' && !window.__profileStatsV2Installed) {
      window.openProfileModal = openProfileModalV2;
      window.__profileStatsV2Installed = true;
    }
  }

  window.addEventListener('load', install);
  if (document.readyState === 'complete') install();
})();
