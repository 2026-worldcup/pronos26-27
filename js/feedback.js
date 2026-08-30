(() => {
  'use strict';
  const session = () => typeof getSession === 'function' ? getSession() : null;
  const client = () => window.supabaseClient;
  const esc = value => { const d=document.createElement('div'); d.textContent=String(value ?? ''); return d.innerHTML; };

  function inject() {
    if (document.getElementById('feedback-fab')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <button id="feedback-fab" class="feedback-fab" type="button" aria-label="Donner un avis" title="Donner un avis">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5v6A2.5 2.5 0 0 1 16.5 14H11l-4.7 4v-4.1A2.5 2.5 0 0 1 5 11.5v-6Z"/><path d="M8.5 7.5h7M8.5 10.5h5"/></svg>
      </button>
      <div id="feedback-modal" class="feedback-modal" aria-hidden="true">
        <div class="feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
          <div class="feedback-head">
            <div><span class="feedback-kicker">Votre avis</span><h3 id="feedback-title">Que pouvons-nous améliorer ?</h3></div>
            <button class="feedback-close" type="button" aria-label="Fermer">×</button>
          </div>
          <p class="feedback-intro">Signalez un problème, proposez une idée ou décrivez une amélioration que vous aimeriez voir.</p>
          <div class="feedback-types" role="radiogroup" aria-label="Type de demande">
            <button type="button" class="feedback-type is-active" data-feedback-type="improvement">Amélioration</button>
            <button type="button" class="feedback-type" data-feedback-type="problem">Problème</button>
            <button type="button" class="feedback-type" data-feedback-type="idea">Idée</button>
            <button type="button" class="feedback-type" data-feedback-type="other">Autre</button>
          </div>
          <label class="feedback-label" for="feedback-message">Votre message</label>
          <textarea id="feedback-message" maxlength="5000" rows="6" placeholder="Décrivez précisément ce que vous avez constaté ou ce que vous aimeriez changer…"></textarea>
          <div class="feedback-meta"><span id="feedback-counter">0 / 5000</span><span>Votre pseudo sera associé à la demande.</span></div>
          <div class="feedback-actions"><button class="btn ghost feedback-cancel" type="button">Annuler</button><button class="btn primary feedback-send" type="button">Envoyer</button></div>
          <div id="feedback-error" class="feedback-error" role="alert"></div>
        </div>
      </div>`);

    const modal=document.getElementById('feedback-modal'), text=document.getElementById('feedback-message'), counter=document.getElementById('feedback-counter');
    const close=()=>{modal.classList.remove('is-open');modal.setAttribute('aria-hidden','true');};
    const open=()=>{const s=session();if(!s){showToast?.('Connectez-vous pour envoyer une demande.','info');return;}document.getElementById('feedback-error').textContent='';modal.classList.add('is-open');modal.setAttribute('aria-hidden','false');setTimeout(()=>text.focus(),80);};
    document.getElementById('feedback-fab').onclick=open;
    modal.querySelector('.feedback-close').onclick=close;
    modal.querySelector('.feedback-cancel').onclick=close;
    modal.onclick=e=>{if(e.target===modal)close();};
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('is-open'))close();});
    text.oninput=()=>counter.textContent=`${text.value.length} / 5000`;
    modal.querySelectorAll('.feedback-type').forEach(button=>button.onclick=()=>{modal.querySelectorAll('.feedback-type').forEach(x=>x.classList.remove('is-active'));button.classList.add('is-active');});
    modal.querySelector('.feedback-send').onclick=async()=>{
      const s=session(), message=text.value.trim(), type=modal.querySelector('.feedback-type.is-active')?.dataset.feedbackType||'improvement', error=document.getElementById('feedback-error'), send=modal.querySelector('.feedback-send');
      if(!s){error.textContent='Connectez-vous pour envoyer une demande.';return;}
      if(message.length<3){error.textContent='Décrivez votre demande en quelques mots.';text.focus();return;}
      if(!client()){error.textContent='Service momentanément indisponible.';return;}
      send.disabled=true;send.textContent='Envoi…';error.textContent='';
      const {error:rpcError}=await client().rpc('submit_user_feedback',{p_pseudo:s.pseudo,p_code_hash:s.codeHash,p_feedback_type:type,p_message:message,p_page:location.pathname+location.search});
      send.disabled=false;send.textContent='Envoyer';
      if(rpcError){console.error(rpcError);error.textContent='Impossible d’envoyer votre demande. Réessayez dans un instant.';return;}
      text.value='';counter.textContent='0 / 5000';close();showToast?.('Merci, votre demande a bien été envoyée.','success');
    };
  }

  function styles(){
    if(document.getElementById('feedback-styles'))return;
    const s=document.createElement('style');s.id='feedback-styles';s.textContent=`
      .feedback-fab{position:fixed;left:18px;bottom:18px;width:54px;height:54px;border:1px solid rgba(219,39,119,.2);border-radius:50%;display:grid;place-items:center;z-index:1100;background:linear-gradient(145deg,#fff,#fff0f6);box-shadow:0 10px 28px rgba(80,50,75,.18),inset 0 1px 0 #fff;color:#b93678;cursor:pointer;transition:transform .2s ease,box-shadow .2s ease}.feedback-fab:hover{transform:translateY(-3px) scale(1.03);box-shadow:0 14px 32px rgba(80,50,75,.22),inset 0 1px 0 #fff}.feedback-fab:active{transform:scale(.96)}.feedback-fab svg{width:25px;height:25px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.feedback-modal{position:fixed;inset:0;z-index:1400;display:none;align-items:center;justify-content:center;padding:14px;background:rgba(34,22,31,.34);backdrop-filter:blur(5px)}.feedback-modal.is-open{display:flex}.feedback-dialog{width:min(600px,100%);max-height:min(720px,calc(100vh - 28px));overflow:auto;padding:22px;border:1px solid rgba(219,39,119,.16);border-radius:24px;background:linear-gradient(145deg,rgba(255,255,255,.99),rgba(255,244,248,.99));box-shadow:0 24px 70px rgba(50,25,43,.24)}.feedback-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.feedback-kicker{display:block;margin-bottom:4px;color:#c0477f;font-size:.65rem;font-weight:900;letter-spacing:.11em;text-transform:uppercase}.feedback-head h3{margin:0;color:#4d5269;font-size:1.2rem}.feedback-close{width:34px;height:34px;border:0;border-radius:11px;background:#f2eaf0;color:#7c7180;font-size:1.35rem;cursor:pointer}.feedback-intro{margin:9px 0 17px;color:#777185;font-size:.76rem;line-height:1.5}.feedback-types{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:17px}.feedback-type{padding:8px 12px;border:1px solid #e5dce3;border-radius:999px;background:#fff;color:#726b76;font:inherit;font-size:.69rem;font-weight:750;cursor:pointer;transition:.18s ease}.feedback-type:hover{border-color:#e2a4bf}.feedback-type.is-active{border-color:rgba(219,39,119,.28);background:linear-gradient(135deg,#ffe6f0,#ffd5e6);color:#a63368;box-shadow:0 4px 12px rgba(219,39,119,.1)}.feedback-label{display:block;margin:0 0 7px;color:#5d5864;font-size:.7rem;font-weight:850}.feedback-dialog textarea{display:block;width:100%;box-sizing:border-box;resize:vertical;min-height:135px;padding:12px 13px;border:1px solid #e4dbe2;border-radius:14px;outline:0;background:rgba(255,255,255,.9);color:#4c4852;font:inherit;font-size:.76rem;line-height:1.5;transition:.18s ease}.feedback-dialog textarea:focus{border-color:rgba(219,39,119,.45);box-shadow:0 0 0 4px rgba(219,39,119,.08)}.feedback-meta{display:flex;justify-content:space-between;gap:10px;margin-top:6px;color:#9a919b;font-size:.58rem}.feedback-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:17px}.feedback-actions .btn{min-width:100px}.feedback-send:disabled{opacity:.6;cursor:wait}.feedback-error{min-height:18px;margin-top:8px;color:#b4234d;font-size:.65rem}@media(max-width:520px){.feedback-fab{left:13px;bottom:13px;width:50px;height:50px}.feedback-dialog{padding:18px;border-radius:20px}.feedback-head h3{font-size:1.05rem}.feedback-meta{flex-direction:column;gap:2px}.feedback-actions .btn{min-width:0;flex:1}}
    `;document.head.appendChild(s);
  }
  function init(){styles();inject();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
