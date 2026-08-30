/* ============================================================
   PRONOS 2026 — Statut de profil + bouton Voir mon profil
   ============================================================ */
(() => {
  'use strict';

  const STATUS_MAX = 80;

  function statusText(value) {
    return String(value ?? '').trim().slice(0, STATUS_MAX);
  }

  async function loadMyStatus() {
    const session = typeof getSession === 'function' ? getSession() : null;
    if (!session) return null;
    const { data, error } = await supabaseClient
      .from('public_users')
      .select('status, status_expires_at')
      .eq('pseudo', session.pseudo)
      .maybeSingle();
    if (error) {
      console.error('Erreur chargement statut:', error);
      return null;
    }
    return data || null;
  }

  function createStatusBubble(status) {
    const text = statusText(status);
    if (!text) return '';
    return `<div class="profile-status-bubble" role="status">${escapeHTML(text)}</div>`;
  }

  function addStatusEditor() {
    const modal = document.getElementById('account-edit-modal');
    if (!modal || document.getElementById('edit-input-status')) return;
    const descriptionGroup = document.getElementById('edit-input-description')?.closest('.form-group');
    if (!descriptionGroup) return;

    const group = document.createElement('div');
    group.className = 'form-group';
    group.id = 'status-edit-group';
    group.innerHTML = `
      <label>Statut (<span id="edit-status-counter">0 / ${STATUS_MAX}</span>)</label>
      <textarea id="edit-input-status" rows="2" maxlength="${STATUS_MAX}" placeholder="Une courte phrase… emojis acceptés"></textarea>
      <small class="status-edit-hint">Visible sur votre profil pendant 24 h.</small>
      <button type="button" class="btn primary field-save-btn" id="save-btn-status">Publier le statut</button>
      <button type="button" class="btn ghost field-save-btn" id="delete-btn-status" style="margin-left:6px;">Supprimer le statut</button>
    `;
    descriptionGroup.insertAdjacentElement('afterend', group);

    const input = document.getElementById('edit-input-status');
    input.addEventListener('input', updateStatusEditor);
    document.getElementById('save-btn-status').addEventListener('click', () => saveStatus(false));
    document.getElementById('delete-btn-status').addEventListener('click', () => saveStatus(true));
  }

  function updateStatusCounter() {
    const input = document.getElementById('edit-input-status');
    const counter = document.getElementById('edit-status-counter');
    if (input && counter) counter.innerText = `${input.value.length} / ${STATUS_MAX}`;
  }

  function updateStatusEditor() {
    const input = document.getElementById('edit-input-status');
    const save = document.getElementById('save-btn-status');
    const del = document.getElementById('delete-btn-status');
    if (!input || !save || !del) return;
    updateStatusCounter();
    const hasText = !!statusText(input.value);
    save.style.display = hasText ? 'inline-block' : 'none';
    del.style.display = hasText ? 'inline-block' : 'none';
  }

  async function refreshStatusEditor() {
    const input = document.getElementById('edit-input-status');
    if (!input) return;
    const data = await loadMyStatus();
    input.value = statusText(data?.status);
    updateStatusEditor();
  }

  async function saveStatus(clear) {
    const session = typeof getSession === 'function' ? getSession() : null;
    if (!session) return;
    const input = document.getElementById('edit-input-status');
    const value = clear ? null : statusText(input?.value);
    if (!clear && !value) {
      showToast('Écrivez un statut ou supprimez-le.', 'warning');
      return;
    }

    const save = document.getElementById('save-btn-status');
    const del = document.getElementById('delete-btn-status');
    if (save) save.disabled = true;
    if (del) del.disabled = true;

    const { error } = await supabaseClient.rpc('update_status', {
      p_pseudo: session.pseudo,
      p_code_hash: session.codeHash,
      p_status: value
    });

    if (save) save.disabled = false;
    if (del) del.disabled = false;

    if (error) {
      if (/Authentification invalide/i.test(error.message || '')) {
        showToast('Session expirée, reconnectez-vous.', 'warning');
        handleLogout();
      } else {
        showToast('Erreur : ' + error.message, 'error');
      }
      return;
    }

    if (input) input.value = value || '';
    updateStatusEditor();
    showToast(clear ? 'Statut supprimé.' : 'Statut publié pour 24 h !', 'success');
    if (typeof updateAccountDashboard === 'function') await updateAccountDashboard();
    await renderCurrentProfileButton();
  }

  function addProfileButton() {
    const hero = document.querySelector('#account-logged-in-view .account-hero');
    if (!hero || document.getElementById('view-my-profile-btn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'view-my-profile-btn';
    btn.className = 'btn ghost profile-view-button';
    btn.innerHTML = '👁️ Voir mon profil';
    btn.addEventListener('click', () => {
      const session = typeof getSession === 'function' ? getSession() : null;
      if (session) openProfileModal(session.pseudo);
    });
    hero.appendChild(btn);
  }

  async function renderCurrentProfileButton() {
    addProfileButton();
  }

  async function injectStatusIntoProfile(pseudo) {
    const card = document.querySelector('#profile-modal .profile-social-card');
    const avatar = card?.querySelector('.profile-avatar-xl');
    if (!avatar) return;

    const { data, error } = await supabaseClient
      .from('public_users')
      .select('status, status_expires_at')
      .eq('pseudo', pseudo)
      .maybeSingle();
    if (error) return;

    card.querySelector('.profile-status-bubble')?.remove();
    const status = statusText(data?.status);
    if (!status || !data?.status_expires_at || new Date(data.status_expires_at) <= new Date()) return;
    avatar.insertAdjacentHTML('beforeend', createStatusBubble(status));
  }

  function wrapProfileModal() {
    if (window.__statusProfileWrapped || typeof window.openProfileModal !== 'function') return;
    const original = window.openProfileModal;
    window.openProfileModal = async function(pseudo) {
      const result = await original.apply(this, arguments);
      await injectStatusIntoProfile(pseudo);
      return result;
    };
    window.__statusProfileWrapped = true;
  }

  function wrapAccountEditModal() {
    if (window.__statusAccountWrapped || typeof window.openAccountEditModal !== 'function') return;
    const original = window.openAccountEditModal;
    window.openAccountEditModal = async function() {
      addStatusEditor();
      const result = await original.apply(this, arguments);
      await refreshStatusEditor();
      return result;
    };
    window.__statusAccountWrapped = true;
  }

  function installUI() {
    addStatusEditor();
    addProfileButton();
    wrapProfileModal();
    wrapAccountEditModal();
  }

  function installStyles() {
    if (document.getElementById('profile-status-styles')) return;
    const style = document.createElement('style');
    style.id = 'profile-status-styles';
    style.textContent = `
      .profile-avatar-xl { position: relative; }
      .profile-status-bubble {
        position: absolute;
        left: calc(100% - 8px);
        top: -10px;
        z-index: 5;
        width: max-content;
        max-width: min(270px, 70vw);
        padding: 8px 12px;
        border-radius: 15px 15px 15px 4px;
        background: var(--bg-card);
        color: var(--text-main);
        border: 1px solid var(--border);
        box-shadow: 0 7px 18px rgba(15,37,87,.16);
        font-size: .72rem;
        font-weight: 700;
        line-height: 1.25;
        text-align: left;
        white-space: normal;
        overflow-wrap: anywhere;
        animation: statusBubbleIn .2s ease-out;
      }
      .profile-status-bubble::before {
        content: '';
        position: absolute;
        left: -7px;
        bottom: 6px;
        width: 12px;
        height: 12px;
        background: var(--bg-card);
        border-left: 1px solid var(--border);
        border-bottom: 1px solid var(--border);
        transform: rotate(45deg);
      }
      .status-edit-hint {
        display: block;
        margin-top: 5px;
        color: var(--text-muted);
        font-size: .68rem;
      }
      #status-edit-group .field-save-btn { margin-top: 8px; }
      .profile-view-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        margin: 14px auto 0;
        min-width: 190px;
      }
      @keyframes statusBubbleIn {
        from { opacity: 0; transform: translateY(4px) scale(.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @media (max-width: 640px) {
        .profile-status-bubble {
          left: 54px;
          top: -18px;
          max-width: min(230px, 62vw);
          font-size: .68rem;
        }
      }
    `;
    document.head.appendChild(style);
  }

  async function initEnhancements() {
    installStyles();
    installUI();
    setTimeout(installUI, 250);
    setTimeout(installUI, 1000);
  }

  window.addEventListener('load', initEnhancements);
  if (document.readyState === 'complete') initEnhancements();
})();
