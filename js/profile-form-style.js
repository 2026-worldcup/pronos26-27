/* ============================================================
   PRONOS 2026 — Style de la forme récente
   Reproduction du composant de référence : carte rose, titre,
   sous-titre et 5 indicateurs alignés de droite à gauche.
   ============================================================ */
(() => {
  'use strict';

  const STYLE_ID = 'profile-form-reference-style';

  function install() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .profile-form-strip-v2 {
        box-sizing: border-box !important;
        width: 100% !important;
        min-height: 84px !important;
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 18px !important;
        padding: 14px 20px !important;
        border: 1px solid #ead9e0 !important;
        border-radius: 18px !important;
        background: linear-gradient(105deg, #fff0f5 0%, #fff7fa 52%, #fffafd 100%) !important;
        box-shadow: 0 3px 9px rgba(90, 55, 70, .06) !important;
        overflow: hidden !important;
      }

      .profile-form-strip-v2 > div:first-child {
        min-width: 0 !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
        gap: 3px !important;
      }

      .profile-form-title-v2 {
        display: flex !important;
        align-items: center !important;
        gap: 7px !important;
        margin: 0 !important;
        color: #596579 !important;
        font-size: 1.02rem !important;
        line-height: 1.15 !important;
        font-weight: 900 !important;
        letter-spacing: .035em !important;
        text-transform: uppercase !important;
      }

      .profile-form-title-v2::before {
        content: '🔥' !important;
        display: inline-block !important;
        font-size: 1.12rem !important;
        line-height: 1 !important;
        letter-spacing: 0 !important;
      }

      .profile-form-strip-v2 > div:first-child > small.desc {
        margin: 0 !important;
        color: #687386 !important;
        font-size: 1rem !important;
        line-height: 1.15 !important;
        font-weight: 400 !important;
        letter-spacing: .01em !important;
      }

      .profile-form-dots-v2 {
        display: flex !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 8px !important;
        flex: 0 0 auto !important;
        min-width: 112px !important;
      }

      .profile-form-dot-v2 {
        width: 19px !important;
        height: 19px !important;
        flex: 0 0 19px !important;
        border-radius: 50% !important;
        border: 0 !important;
        box-shadow: none !important;
        background: #e2e8f0 !important;
        transform: none !important;
      }

      .profile-form-dot-v2 span {
        display: none !important;
      }

      .profile-form-dot-v2.miss { background: #e75b62 !important; }
      .profile-form-dot-v2.issue { background: #4f86d9 !important; }
      .profile-form-dot-v2.diff { background: #d77aa8 !important; }
      .profile-form-dot-v2.exact {
        background: radial-gradient(circle at 38% 34%, #ffe98a 0%, #d99b08 68%, #b87900 100%) !important;
        box-shadow: 0 0 0 1px rgba(213, 154, 8, .16), 0 0 9px rgba(224, 166, 18, .38) !important;
        animation: profileFormReferenceExact 1.8s ease-in-out infinite !important;
      }

      @keyframes profileFormReferenceExact {
        0%, 100% { transform: scale(1); filter: brightness(1); }
        50% { transform: scale(1.09); filter: brightness(1.12); }
      }

      .profile-form-empty {
        color: #687386 !important;
        font-size: .9rem !important;
        font-weight: 500 !important;
      }

      .profile-form-dot-v2.placeholder {
        background: #e2e8f0 !important;
        box-shadow: none !important;
        animation: none !important;
      }

      @media (max-width: 520px) {
        .profile-form-strip-v2 {
          min-height: 78px !important;
          padding: 12px 14px !important;
          gap: 10px !important;
          border-radius: 16px !important;
        }
        .profile-form-title-v2 { font-size: .84rem !important; }
        .profile-form-title-v2::before { font-size: .98rem !important; }
        .profile-form-strip-v2 > div:first-child > small.desc { font-size: .82rem !important; }
        .profile-form-dots-v2 { gap: 5px !important; min-width: 96px !important; }
        .profile-form-dot-v2 { width: 17px !important; height: 17px !important; flex-basis: 17px !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function normalizeDots() {
    document.querySelectorAll('.profile-form-dots-v2').forEach(container => {
      const dots = [...container.querySelectorAll('.profile-form-dot-v2')];
      while (dots.length < 5) {
        const placeholder = document.createElement('span');
        placeholder.className = 'profile-form-dot-v2 placeholder';
        placeholder.setAttribute('aria-hidden', 'true');
        container.appendChild(placeholder);
        dots.push(placeholder);
      }
    });
  }

  function init() {
    install();
    normalizeDots();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  new MutationObserver(normalizeDots).observe(document.documentElement, { childList: true, subtree: true });
})();
