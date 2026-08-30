/* ============================================================
   PRONOS 2026 — Statut de profil + visualisation du profil
   ============================================================ */
(() => {
  'use strict';
  const STATUS_MAX = 80;
  const statusText = value => String(value ?? '').trim().slice(0, STATUS_MAX);

  function safeEscape(value) {
    if (typeof escapeHTML === 'function') return escapeHTML(value);
    const div = document.createElement('div'); div.textContent = String(value ?? ''); return div.innerHTML;
  }

  async function loadMyStatus() {
    const session = typeof getSession === 'function' ? getSession() : null;
    if (!session) return null;
    const { data, error } = await supabaseClient.from('public_users').select('status, status_expires_at').eq('pseudo', session.pseudo).maybeSingle();
    if (error) console.error('Erreur chargement statut:', error);
    return data || null;
  }

  function activeStatus(data) {
    return !!(data?.status && data?.status_expires_at && new Date(data.status_expires_at) > new Date());
  }

  function createStatusBubble(status) {
    const text = statusText(status);
    return text ? `<div class="profile-status-bubble" role="status">${safeEscape(text)}</div>` : '';
  }

  async function renderAccountStatus() {
    const avatar = document.getElementById('acc-hero-avatar');
    if (!avatar) return;
    avatar.querySelector('.profile-status-bubble')?.remove();
    const data = await loadMyStatus();
    if (activeStatus(data)) avatar.insertAdjacentHTML('beforeend', createStatusBubble(data.status));
  }

  function addStatusEditor() {
    const modal = document.getElementById('account-edit-modal');
    if (!modal || document.getElementById('edit-input-status')) return;
    const descriptionGroup = document.getElementById('edit-input-description')?.closest('.form-group');
    if (!descriptionGroup) return;
    const group = document.createElement('div'); group.className = 'form-group'; group.id = 'status-edit-group';
    group.innerHTML = `<label>Statut (<span id="edit-status-counter">0 / ${STATUS_MAX}</span>)</label>
      <textarea id="edit-input-status" rows="2" maxlength="${STATUS_MAX}" placeholder="Une courte phrase… emojis acceptés"></textarea>
      <small class="status-edit-hint">Visible sur votre profil pendant 24 h.</small>
      <button type="button" class="btn primary field-save-btn" id="save-btn-status">Publier le statut</button>
      <button type="button" class="btn ghost field-save-btn" id="delete-btn-status">Supprimer le statut</button>`;
    descriptionGroup.insertAdjacentElement('afterend', group);
    document.getElementById('edit-input-status').addEventListener('input', updateStatusEditor);
    document.getElementById('save-btn-status').addEventListener('click', () => saveStatus(false));
    document.getElementById('delete-btn-status').addEventListener('click', () => saveStatus(true));
  }

  function updateStatusEditor() {
    const input = document.getElementById('edit-input-status'), counter = document.getElementById('edit-status-counter'), save = document.getElementById('save-btn-status'), del = document.getElementById('delete-btn-status');
    if (!input || !counter || !save || !del) return;
    counter.innerText = `${input.value.length} / ${STATUS_MAX}`;
    const hasText = !!statusText(input.value);
    save.style.display = hasText ? 'inline-block' : 'none'; del.style.display = hasText ? 'inline-block' : 'none';
  }

  async function refreshStatusEditor() {
    const input = document.getElementById('edit-input-status'); if (!input) return;
    const data = await loadMyStatus(); input.value = statusText(data?.status); updateStatusEditor();
  }

  async function saveStatus(clear) {
    const session = typeof getSession === 'function' ? getSession() : null; if (!session) return;
    const input = document.getElementById('edit-input-status'), value = clear ? null : statusText(input?.value);
    if (!clear && !value) return showToast('Écrivez un statut ou supprimez-le.', 'warning');
    const { error } = await supabaseClient.rpc('update_status', { p_pseudo: session.pseudo, p_code_hash: session.codeHash, p_status: value });
    if (error) return showToast('Erreur : ' + error.message, 'error');
    input.value = value || ''; updateStatusEditor();
    showToast(clear ? 'Statut supprimé.' : 'Statut publié pour 24 h !', 'success');
    if (typeof updateAccountDashboard === 'function') await updateAccountDashboard();
    await renderAccountStatus();
  }

  function ensureHistoryModal() {
    if (document.getElementById('profile-history-modal')) return;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay profile-history-modal'; modal.id = 'profile-history-modal';
    modal.innerHTML = `<div class="modal-box profile-history-modal-box">
      <div class="modal-header"><h3 id="profile-history-modal-title">Historique des pronostics</h3><button type="button" class="modal-close" id="profile-history-modal-close" aria-label="Fermer">✕</button></div>
      <div id="profile-history-modal-body"></div>
    </div>`;
    document.body.appendChild(modal);
    document.getElementById('profile-history-modal-close').addEventListener('click', closeHistoryModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeHistoryModal(); });
  }

  function openHistoryModal(pseudo, section) {
    ensureHistoryModal();
    const sourceList = section?.querySelector('.profile-history-list');
    const body = document.getElementById('profile-history-modal-body');
    const title = document.getElementById('profile-history-modal-title');
    if (!body || !title) return;
    title.textContent = `Historique de ${pseudo}`;
    body.innerHTML = sourceList?.innerHTML || '<p class="desc">Aucun pronostic pour le moment.</p>';
    document.getElementById('profile-history-modal').style.display = 'flex';
  }

  function closeHistoryModal() {
    const modal = document.getElementById('profile-history-modal'); if (modal) modal.style.display = 'none';
  }

  function separateProfileHistory(pseudo) {
    const section = document.querySelector('#profile-modal .profile-history-section');
    if (!section) return;
    const button = section.querySelector('.profile-history-button'), list = section.querySelector('.profile-history-list');
    if (!button || !list) return;
    list.classList.add('profile-history-collapsed');
    button.removeAttribute('onclick');
    button.innerHTML = `<svg class="profile-history-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5V5.5Z"/><path d="M4 5.5V21.5M8 7h8M8 11h8M8 15h5"/></svg><span>Voir l’historique des pronostics</span>`;
    button.onclick = () => openHistoryModal(pseudo, section);
  }

  async function injectStatusIntoProfile(pseudo) {
    const avatar = document.querySelector('#profile-modal .profile-avatar-xl'); if (!avatar) return;
    avatar.querySelector('.profile-status-bubble')?.remove();
    const { data } = await supabaseClient.from('public_users').select('status, status_expires_at').eq('pseudo', pseudo).maybeSingle();
    if (activeStatus(data)) avatar.insertAdjacentHTML('beforeend', createStatusBubble(data.status));
    separateProfileHistory(pseudo);
  }

  function wrapProfileModal() {
    if (window.__statusProfileWrapped || typeof window.openProfileModal !== 'function') return;
    const original = window.openProfileModal;
    window.openProfileModal = async function(pseudo) { const result = await original.apply(this, arguments); await injectStatusIntoProfile(pseudo); return result; };
    window.__statusProfileWrapped = true;
  }

  function wrapAccountEditModal() {
    if (window.__statusAccountWrapped || typeof window.openAccountEditModal !== 'function') return;
    const original = window.openAccountEditModal;
    window.openAccountEditModal = async function() { const result = await original.apply(this, arguments); addStatusEditor(); await refreshStatusEditor(); return result; };
    window.__statusAccountWrapped = true;
  }

  function addProfileButton() {
    const hero = document.querySelector('#account-logged-in-view .account-hero');
    if (!hero || document.getElementById('view-my-profile-btn')) return;
    const btn = document.createElement('button'); btn.type = 'button'; btn.id = 'view-my-profile-btn'; btn.className = 'btn ghost profile-view-button';
    btn.innerHTML = `<svg class="profile-view-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.8"/></svg><span>Voir mon profil</span>`;
    btn.addEventListener('click', () => { const s = typeof getSession === 'function' ? getSession() : null; if (s) openProfileModal(s.pseudo); });
    hero.appendChild(btn);
  }

  function installStyles() {
    if (document.getElementById('profile-status-styles')) return;
    const style = document.createElement('style'); style.id = 'profile-status-styles';
    style.textContent = `
      .account-hero-avatar,.profile-avatar-xl { position:relative !important; }
      .profile-status-bubble { position:absolute; left:50%; bottom:calc(100% + 12px); transform:translateX(-50%); z-index:50; box-sizing:border-box; width:max-content; max-width:min(300px,calc(100vw - 30px)); padding:9px 13px; border-radius:16px 16px 16px 5px; background:var(--bg-card); color:var(--text-main); border:1px solid var(--border); box-shadow:0 9px 24px rgba(15,37,87,.18); font-size:.74rem; font-weight:700; line-height:1.3; text-align:left; white-space:normal; overflow-wrap:anywhere; word-break:break-word; pointer-events:none; }
      .profile-status-bubble::after { content:''; position:absolute; left:50%; bottom:-6px; width:11px; height:11px; background:var(--bg-card); border-right:1px solid var(--border); border-bottom:1px solid var(--border); transform:translateX(-50%) rotate(45deg); }
      .account-hero,.profile-social-card { overflow:visible !important; }
      .profile-view-button { display:inline-flex; align-items:center; justify-content:center; gap:8px; margin:14px auto 0; min-width:190px; }
      .profile-view-icon,.profile-history-icon { width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; flex:0 0 auto; }
      .status-edit-hint { display:block; margin-top:5px; color:var(--text-muted); font-size:.68rem; }
      #status-edit-group .field-save-btn { margin-top:8px; }
      .profile-history-modal { z-index:1200; }
      .profile-history-modal-box { width:min(560px,calc(100vw - 28px)); max-height:min(88vh,760px); overflow:hidden; }
      #profile-history-modal-body { max-height:calc(min(88vh,760px) - 78px); overflow-y:auto; padding:0 2px 2px 0; }
      #profile-history-modal-body .profile-history-list { display:flex; flex-direction:column; gap:8px; max-height:none; overflow:visible; }
      #profile-history-modal-body .profile-history-collapsed { display:flex; }
      #profile-history-modal-body .profile-prediction-card { width:100%; }
      @media(max-width:640px){ .profile-status-bubble { max-width:calc(100vw - 24px); font-size:.7rem; } .profile-history-modal-box { width:calc(100vw - 20px); } }
    `;
    document.head.appendChild(style);
  }

  function installUI() { addStatusEditor(); addProfileButton(); renderAccountStatus(); wrapProfileModal(); wrapAccountEditModal(); }
  function init() { installStyles(); installUI(); setTimeout(installUI,250); setTimeout(installUI,1000); }
  window.addEventListener('load', init); if (document.readyState === 'complete') init();
})();