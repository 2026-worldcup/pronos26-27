/* ============================================================
   PRONOS 2026 — Notifications
   - Préférences extensibles via Supabase
   - Notification navigateur pour les matchs à moins de 10 h
   - Centre spécial listant tous les matchs concernés
   ============================================================ */
(() => {
  'use strict';

  const TYPE_MATCH_DEADLINE = 'match_deadline';
  const WINDOW_MS = 10 * 60 * 60 * 1000;
  const CHECK_INTERVAL_MS = 60 * 1000;
  const SEEN_PREFIX = 'pronos26_notification_seen_v1:';

  let currentMissingMatches = [];
  let notificationTimer = null;

  const session = () => typeof getSession === 'function' ? getSession() : null;
  const client = () => window.supabaseClient;

  function escapeHtml(value) {
    if (typeof escapeHTML === 'function') return escapeHTML(value);
    const div = document.createElement('div');
    div.textContent = String(value ?? '');
    return div.innerHTML;
  }

  function formatCountdown(date) {
    const diff = Math.max(0, new Date(date).getTime() - Date.now());
    const totalMinutes = Math.ceil(diff / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `H-${hours}h${String(minutes).padStart(2, '0')}` : `H-${minutes} min`;
  }

  function formatMatchDate(date) {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(new Date(date));
  }

  async function getPreferences() {
    const s = session();
    if (!s || !client()) return {};
    const { data, error } = await client().rpc('get_notification_preferences', {
      p_pseudo: s.pseudo,
      p_code_hash: s.codeHash
    });
    if (error) {
      console.error('Notifications — préférences:', error);
      return {};
    }
    return Object.fromEntries((data || []).map(row => [row.notification_type, row.enabled]));
  }

  async function setPreference(type, enabled) {
    const s = session();
    if (!s || !client()) return false;
    const { error } = await client().rpc('update_notification_preference', {
      p_pseudo: s.pseudo,
      p_code_hash: s.codeHash,
      p_notification_type: type,
      p_enabled: !!enabled
    });
    if (error) {
      showToast?.('Impossible d’enregistrer la préférence.', 'error');
      console.error('Notifications — sauvegarde:', error);
      return false;
    }
    return true;
  }

  async function getMissingMatches() {
    const s = session();
    if (!s || !client()) return [];

    const now = new Date();
    const limit = new Date(now.getTime() + WINDOW_MS);
    const [{ data: matches, error: matchError }, { data: pronostics, error: pronoError }] = await Promise.all([
      client().from('matches').select('id,competition,phase,division,team1,team2,match_date').gt('match_date', now.toISOString()).lte('match_date', limit.toISOString()).order('match_date', { ascending: true }),
      client().from('pronostics').select('match_id').eq('pseudo', s.pseudo)
    ]);

    if (matchError || pronoError) {
      console.error('Notifications — chargement des matchs:', matchError || pronoError);
      return [];
    }

    const predicted = new Set((pronostics || []).map(p => p.match_id));
    return (matches || []).filter(match => !predicted.has(match.id));
  }

  function ensureModal() {
    if (document.getElementById('notifications-modal')) return;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay notifications-modal';
    modal.id = 'notifications-modal';
    modal.innerHTML = `
      <div class="modal-box notifications-modal-box">
        <div class="modal-header">
          <div>
            <h3>🔔 Pronostics à compléter</h3>
            <p class="notifications-modal-subtitle">Tous les matchs dans les 10 prochaines heures sans pronostic.</p>
          </div>
          <button type="button" class="modal-close" id="notifications-modal-close" aria-label="Fermer">✕</button>
        </div>
        <div id="notifications-missing-list" class="notifications-missing-list"></div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('notifications-modal-close').addEventListener('click', closeMissingModal);
    modal.addEventListener('click', event => { if (event.target === modal) closeMissingModal(); });
  }

  function openMatchFromNotification(match) {
    const rows = [...document.querySelectorAll('.match-row')];
    const target = rows.find(row => {
      const text = row.textContent || '';
      return text.includes(match.team1) && text.includes(match.team2);
    });
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => target.click(), 180);
      return;
    }
    showToast?.('Ouvrez la compétition du match pour déposer votre pronostic.', 'info');
  }

  function renderMissingList(matches) {
    const list = document.getElementById('notifications-missing-list');
    if (!list) return;
    if (!matches.length) {
      list.innerHTML = '<div class="notifications-empty">🎉 Aucun match à pronostiquer dans les 10 prochaines heures.</div>';
      return;
    }
    list.innerHTML = matches.map(match => `
      <button type="button" class="notification-match-item" data-match-id="${escapeHtml(match.id)}">
        <span class="notification-match-main">
          <strong>${escapeHtml(match.team1)} <span>×</span> ${escapeHtml(match.team2)}</strong>
          <small>${escapeHtml(formatMatchDate(match.match_date))}</small>
        </span>
        <span class="notification-countdown">${escapeHtml(formatCountdown(match.match_date))}</span>
      </button>`).join('');
    list.querySelectorAll('.notification-match-item').forEach(button => {
      button.addEventListener('click', () => {
        const match = currentMissingMatches.find(item => item.id === button.dataset.matchId);
        if (match) openMatchFromNotification(match);
      });
    });
  }

  async function openMissingModal() {
    ensureModal();
    currentMissingMatches = await getMissingMatches();
    renderMissingList(currentMissingMatches);
    document.getElementById('notifications-modal').style.display = 'flex';
  }

  function closeMissingModal() {
    const modal = document.getElementById('notifications-modal');
    if (modal) modal.style.display = 'none';
  }

  function markSeen(match) {
    try {
      localStorage.setItem(SEEN_PREFIX + match.id, String(new Date(match.match_date).getTime()));
    } catch (_) {}
  }

  function hasSeen(match) {
    try {
      return !!localStorage.getItem(SEEN_PREFIX + match.id);
    } catch (_) { return false; }
  }

  function showBrowserNotification(match) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const notification = new Notification(formatCountdown(match.match_date) + ' pour pronostiquer', {
      body: `${match.team1} × ${match.team2}`,
      tag: `pronos26-match-${match.id}`,
      renotify: false,
      icon: './favicon.ico'
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
      openMissingModal();
    };
  }

  async function checkAndNotify() {
    const prefs = await getPreferences();
    if (prefs[TYPE_MATCH_DEADLINE] === false) return;
    const matches = await getMissingMatches();
    for (const match of matches) {
      if (!hasSeen(match)) {
        showBrowserNotification(match);
        markSeen(match);
      }
    }
    const button = document.getElementById('notifications-account-button');
    if (button) {
      button.classList.toggle('has-notifications', matches.length > 0);
      const badge = button.querySelector('.notifications-count');
      if (badge) badge.textContent = matches.length ? String(matches.length) : '';
    }
  }

  async function requestPermission() {
    if (!('Notification' in window)) {
      showToast?.('Les notifications navigateur ne sont pas disponibles sur cet appareil.', 'warning');
      return false;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      showToast?.('Notifications activées !', 'success');
      await checkAndNotify();
      return true;
    }
    showToast?.('Autorisation des notifications refusée par le navigateur.', 'warning');
    return false;
  }

  async function renderSettings() {
    const body = document.getElementById('notifications-settings-body');
    if (!body) return;
    const prefs = await getPreferences();
    const browserState = 'Notification' in window ? Notification.permission : 'unsupported';
    body.innerHTML = `
      <div class="notification-browser-state ${browserState}">
        <span>${browserState === 'granted' ? '🟢' : browserState === 'denied' ? '🔴' : '⚪'}</span>
        <div><strong>${browserState === 'granted' ? 'Notifications autorisées' : browserState === 'denied' ? 'Notifications bloquées' : 'Notifications non activées'}</strong>
        <small>${browserState === 'granted' ? 'Le navigateur peut vous prévenir lorsqu’un pronostic manque.' : 'Autorisez-les pour recevoir les alertes.'}</small></div>
      </div>
      <div class="notification-setting-row">
        <div><strong>H-x pour pronostiquer</strong><small>Un match sans pronostic dans les 10 prochaines heures.</small></div>
        <label class="notification-switch"><input type="checkbox" id="notification-pref-match-deadline" ${prefs[TYPE_MATCH_DEADLINE] !== false ? 'checked' : ''}><span></span></label>
      </div>`;

    body.querySelector('#notification-pref-match-deadline').addEventListener('change', async event => {
      const ok = await setPreference(TYPE_MATCH_DEADLINE, event.target.checked);
      if (ok && event.target.checked) await requestPermission();
    });
  }

  function ensureSettingsModal() {
    if (document.getElementById('notifications-settings-modal')) return;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay notifications-modal';
    modal.id = 'notifications-settings-modal';
    modal.innerHTML = `
      <div class="modal-box notifications-settings-box">
        <div class="modal-header"><h3>🔔 Gestion des notifications</h3><button type="button" class="modal-close" id="notifications-settings-close">✕</button></div>
        <div id="notifications-settings-body"></div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('notifications-settings-close').addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', event => { if (event.target === modal) modal.style.display = 'none'; });
  }

  async function openSettings() {
    ensureSettingsModal();
    document.getElementById('notifications-settings-modal').style.display = 'flex';
    await renderSettings();
  }

  function addAccountButton() {
    const hero = document.querySelector('#account-logged-in-view .account-hero');
    if (!hero || document.getElementById('notifications-account-button')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'notifications-account-button';
    button.className = 'btn ghost notifications-account-button';
    button.innerHTML = '<span class="notifications-bell">🔔</span><span>Notifications</span><span class="notifications-count"></span>';
    button.addEventListener('click', openSettings);
    hero.appendChild(button);
  }

  function installStyles() {
    if (document.getElementById('notifications-styles')) return;
    const style = document.createElement('style');
    style.id = 'notifications-styles';
    style.textContent = `
      .notifications-account-button { display:inline-flex; align-items:center; justify-content:center; gap:7px; margin:8px auto 0; min-width:190px; position:relative; }
      .notifications-bell { font-size:1rem; }
      .notifications-count { min-width:18px; height:18px; padding:0 5px; border-radius:999px; background:#ef4444; color:#fff; font-size:.65rem; font-weight:800; display:inline-flex; align-items:center; justify-content:center; }
      .notifications-account-button:not(.has-notifications) .notifications-count { display:none; }
      .notifications-modal { z-index:1250; }
      .notifications-modal-box { width:min(600px,calc(100vw - 24px)); max-height:min(88vh,760px); overflow:hidden; }
      .notifications-modal-subtitle { color:var(--text-muted); font-size:.72rem; margin-top:4px; font-weight:600; }
      .notifications-missing-list { overflow-y:auto; max-height:calc(min(88vh,760px) - 100px); padding:4px 2px 2px; }
      .notification-match-item { width:100%; display:flex; align-items:center; justify-content:space-between; gap:12px; text-align:left; background:var(--bg-match); color:var(--text-main); border:1px solid var(--border); border-radius:12px; padding:13px 14px; margin-bottom:8px; cursor:pointer; transition:transform .15s ease,border-color .15s ease; }
      .notification-match-item:hover { border-color:var(--accent); transform:translateY(-1px); }
      .notification-match-main { display:flex; flex-direction:column; gap:5px; min-width:0; }
      .notification-match-main strong { font-size:.82rem; overflow-wrap:anywhere; }
      .notification-match-main strong span { color:var(--accent); }
      .notification-match-main small { color:var(--text-muted); font-size:.68rem; }
      .notification-countdown { flex:0 0 auto; background:var(--accent); color:#fff; border-radius:999px; padding:5px 9px; font-size:.68rem; font-weight:800; }
      .notifications-empty { text-align:center; padding:30px 12px; color:var(--text-muted); font-weight:700; }
      .notifications-settings-box { width:min(540px,calc(100vw - 24px)); }
      .notification-browser-state { display:flex; gap:12px; align-items:flex-start; background:var(--bg-match); border:1px solid var(--border); border-radius:12px; padding:13px; margin-bottom:12px; }
      .notification-browser-state > span { font-size:1.1rem; }
      .notification-browser-state strong,.notification-browser-state small,.notification-setting-row strong,.notification-setting-row small { display:block; }
      .notification-browser-state small,.notification-setting-row small { color:var(--text-muted); font-size:.68rem; margin-top:4px; line-height:1.35; }
      .notification-setting-row { display:flex; align-items:center; justify-content:space-between; gap:14px; border:1px solid var(--border); border-radius:12px; padding:14px; }
      .notification-switch { position:relative; width:46px; height:26px; flex:0 0 46px; }
      .notification-switch input { opacity:0; width:0; height:0; }
      .notification-switch span { position:absolute; inset:0; background:#cbd5e1; border-radius:999px; cursor:pointer; transition:.2s; }
      .notification-switch span:before { content:''; position:absolute; width:20px; height:20px; left:3px; top:3px; background:white; border-radius:50%; transition:.2s; box-shadow:0 1px 3px rgba(0,0,0,.2); }
      .notification-switch input:checked + span { background:var(--accent); }
      .notification-switch input:checked + span:before { transform:translateX(20px); }
    `;
    document.head.appendChild(style);
  }

  function handleNotificationDeepLink() {
    if (new URLSearchParams(window.location.search).get('notifications') !== 'missing') return;
    const open = () => openMissingModal();
    if (document.readyState === 'complete') setTimeout(open, 500); else window.addEventListener('load', () => setTimeout(open, 500), { once:true });
  }

  function start() {
    installStyles();
    addAccountButton();
    ensureModal();
    ensureSettingsModal();
    handleNotificationDeepLink();
    if (notificationTimer) clearInterval(notificationTimer);
    notificationTimer = setInterval(checkAndNotify, CHECK_INTERVAL_MS);
    setTimeout(checkAndNotify, 1200);
    setTimeout(addAccountButton, 600);
  }

  window.pronosNotifications = { openMissingModal, openSettings, checkAndNotify };
  window.addEventListener('load', start, { once:true });
  if (document.readyState === 'complete') start();
})();
