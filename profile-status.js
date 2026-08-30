/* ============================================================
   PRONOS 2026 — Statut de profil + bouton Voir mon profil
   ============================================================ */
(() => {
  'use strict';
  const STATUS_MAX = 80;
  const statusText = value => String(value ?? '').trim().slice(0, STATUS_MAX);

  async function loadMyStatus() {
    const session = typeof getSession === 'function' ? getSession() : null;
    if (!session) return null;
    const { data, error } = await supabaseClient.from('public_users')
      .select('status, status_expires_at').eq('pseudo', session.pseudo).maybeSingle();
    if (error) console.error('Erreur chargement statut:', error);
    return data || null;
  }

  function createStatusBubble(status) {
    const text = statusText(status);
    return text ? `<div class="profile-status-bubble" role="status">${escapeHTML(text)}</div>` : '';
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
    const input = document.getElementById('edit-input-status');
    const counter = document.getElementById('edit-status-counter');
    const save = document.getElementById('save-btn-status'); const del = document.getElementById('delete-btn-status');
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
    const input = document.getElementById('edit-input-status'); const value = clear ? null : statusText(input?.value);
    if (!clear && !value) return showToast('Écrivez un statut ou supprimez-le.', 'warning');
    const { error } = await supabaseClient.rpc('update_status', { p_pseudo: session.pseudo, p_code_hash: session.codeHash, p_status: value });
    if (error) return showToast('Erreur : ' + error.message, 'error');
    input.value = value || ''; updateStatusEditor();
    showToast(clear ? 'Statut supprimé.' : 'Statut publié pour 24 h !', 'success');
    if (typeof updateAccountDashboard === 'function') await updateAccountDashboard();
    renderAccountStatus();
  }

  async function renderAccountStatus() {
    const host = document.querySelector('#account-logged-in-view .account-hero'); if (!host) return;
    const session = typeof getSession === 'function' ? getSession() : null; if (!session) return;
    let avatar = host.querySelector('.account-status-avatar');
    if (!avatar) { avatar = document.createElement('div'); avatar.className = 'account-status-avatar'; host.appendChild(avatar); }
    const data = await loadMyStatus();
    avatar.innerHTML = `<div class="account-status-avatar-icon">${escapeHTML(session.avatar || '🙂')}</div>${data?.status && data?.status_expires_at && new Date(data.status_expires_at) > new Date() ? createStatusBubble(data.status) : ''}`;
  }

  function addProfileButton() {
    const hero = document.querySelector('#account-logged-in-view .account-hero');
    if (!hero || document.getElementById('view-my-profile-btn')) return;
    const btn = document.createElement('button'); btn.type = 'button'; btn.id = 'view-my-profile-btn'; btn.className = 'btn ghost profile-view-button';
    btn.innerHTML = `<svg class="profile-view-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.8"/></svg><span>Voir mon profil</span>`;
    btn.addEventListener('click', () => { const s = typeof getSession === 'function' ? getSession() : null; if (s) openProfileModal(s.pseudo); });
    hero.appendChild(btn);
  }

  async function injectStatusIntoProfile(pseudo) {
    const card = document.querySelector('#profile-modal .profile-social-card'); const avatar = card?.querySelector('.profile-avatar-xl'); if (!avatar) return;
    const { data } = await supabaseClient.from('public_users').select('status, status_expires_at').eq('pseudo', pseudo).maybeSingle();
    card.querySelector('.profile-status-bubble')?.remove();
    if (data?.status && data?.status_expires_at && new Date(data.status_expires_at) > new Date()) avatar.insertAdjacentHTML('beforeend', createStatusBubble(data.status));
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

  function installStyles() {
    if (document.getElementById('profile-status-styles')) return;
    const style = document.createElement('style'); style.id = 'profile-status-styles';
    style.textContent = `
      .profile-avatar-xl,.account-status-avatar-icon { position:relative; }
      .profile-status-bubble { position:absolute; left:50%; bottom:calc(100% + 12px); transform:translateX(-50%); z-index:20; box-sizing:border-box; width:max-content; max-width:min(260px,calc(100vw - 32px)); padding:8px 12px; border-radius:15px 15px 15px 4px; background:var(--bg-card); color:var(--text-main); border:1px solid var(--border); box-shadow:0 7px 18px rgba(15,37,87,.16); font-size:.72rem; font-weight:700; line-height:1.25; white-space:normal; overflow-wrap:anywhere; }
      .profile-status-bubble::after { content:''; position:absolute; left:50%; bottom:-6px; width:11px; height:11px; background:var(--bg-card); border-right:1px solid var(--border); border-bottom:1px solid var(--border); transform:translateX(-50%) rotate(45deg); }
      .account-status-avatar { position:relative; display:flex; align-items:center; justify-content:center; margin:14px auto 0; min-height:1px; }
      .account-status-avatar-icon { font-size:3rem; line-height:1; }
      .account-status-avatar .profile-status-bubble { bottom:calc(100% + 14px); }
      .profile-view-button { display:inline-flex; align-items:center; justify-content:center; gap:8px; margin:14px auto 0; min-width:190px; }
      .profile-view-icon { width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
      .status-edit-hint { display:block; margin-top:5px; color:var(--text-muted); font-size:.68rem; }
      #status-edit-group .field-save-btn { margin-top:8px; }
      @media(max-width:640px){ .profile-status-bubble { max-width:calc(100vw - 28px); } }
    `;
    document.head.appendChild(style);
  }

  function installUI() { addStatusEditor(); addProfileButton(); renderAccountStatus(); wrapProfileModal(); wrapAccountEditModal(); }
  function init() { installStyles(); installUI(); setTimeout(installUI,250); setTimeout(installUI,1000); }
  window.addEventListener('load', init); if (document.readyState === 'complete') init();
})();