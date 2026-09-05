/* Administration — gestion de la Ligue A / Ligue B de la Ligue des Nations + Premier League + Serie A. */
(() => {
    window.addEventListener('load', () => {
        if (window.__ldnAdminInstalled) return;
        window.__ldnAdminInstalled = true;

        let currentDivision = 'A';
        const originalSelectCompetition = window.selectCompetition;

        const formGrid = document.querySelector('#form-add-match .form-grid');
        const orderGroup = document.getElementById('add-order')?.closest('.form-group');
        if (formGrid && orderGroup) {
            const group = document.createElement('div');
            group.className = 'form-group'; group.id = 'add-division-group';
            group.innerHTML = `<label>Niveau de la Ligue des Nations</label><select id="add-division"><option value="A">Ligue A</option><option value="B">Ligue B</option></select>`;
            formGrid.insertBefore(group, orderGroup);
        }
        const editOrder = document.getElementById('edit-order');
        const editOrderGroup = editOrder?.closest('.form-group');
        if (editOrderGroup) {
            const group = document.createElement('div');
            group.className = 'form-group'; group.id = 'edit-division-group';
            group.innerHTML = `<label>Niveau de la Ligue des Nations</label><select id="edit-division"><option value="A">Ligue A</option><option value="B">Ligue B</option></select>`;
            editOrderGroup.parentElement.insertBefore(group, editOrderGroup);
        }

        const style = document.createElement('style');
        style.textContent = `#add-division-group,#edit-division-group{display:none}.admin-division-badge{display:inline-flex;align-items:center;margin-left:6px;padding:3px 8px;border-radius:999px;font-size:.68rem;font-weight:800;background:#172554;color:#93c5fd;border:1px solid #1d4ed8}.admin-pl-badge{display:inline-flex;align-items:center;margin-left:6px;padding:3px 8px;border-radius:999px;font-size:.68rem;font-weight:800;background:#3b0a2a;color:#f9a8d4;border:1px solid #ec4899}.admin-sa-badge{display:inline-flex;align-items:center;margin-left:6px;padding:3px 8px;border-radius:999px;font-size:.68rem;font-weight:800;background:#052e16;color:#86efac;border:1px solid #22c55e}`;
        document.head.appendChild(style);

        function updateDivisionUI() {
            const visible = currentComp === 'LDN';
            ['add-division-group','edit-division-group'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = visible ? 'flex' : 'none'; });
            const addDivision = document.getElementById('add-division');
            if (addDivision) addDivision.value = currentDivision;
        }

        async function loadMatchesSplit() {
            try {
                let query = supabaseClient.from('matches').select('*').eq('competition', currentComp);
                if (currentComp === 'LDN') query = query.eq('division', currentDivision);
                const { data, error } = await query.order('order_index', { ascending: true }).order('match_date', { ascending: true });
                if (error) throw error;
                matchesList = data || []; updateNextOrderIndex(); renderMatchList();
            } catch (e) { showToast("Erreur de chargement : " + e.message, "error"); }
        }

        window.selectCompetition = function(code) {
            currentComp = code;
            document.querySelectorAll('.comp-btn').forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-code') === code));
            const sw = document.getElementById('admin-ldn-division-switch');
            if (sw) sw.style.display = code === 'LDN' ? 'flex' : 'none';
            updateDivisionUI(); loadMatchesSplit();
        };

        window.handleAddMatch = async function(e) {
            e.preventDefault();
            const team1 = document.getElementById('add-team1').value.trim();
            const team2 = document.getElementById('add-team2').value.trim();
            const dateVal = document.getElementById('add-date').value;
            const phase = document.getElementById('add-phase').value.trim();
            const orderIndex = parseInt(document.getElementById('add-order').value, 10);
            const division = currentComp === 'LDN' ? document.getElementById('add-division').value : null;
            if (!team1 || !team2 || !dateVal || !phase) { showToast("Veuillez remplir tous les champs.", "error"); return; }
            const matchId = `${currentComp}-${Date.now()}`;
            const newMatch = { id: matchId, competition: currentComp, division, team1, team2, match_date: new Date(dateVal).toISOString(), phase, order_index: orderIndex, created_at: new Date().toISOString() };
            const { error } = await supabaseClient.from('matches').insert([newMatch]);
            if (error) showToast("Erreur lors de l'ajout : " + error.message, "error");
            else { showToast(`Match ajouté en ${currentComp === 'LDN' ? `Ligue ${division}` : currentComp} !`); document.getElementById('add-team1').value=''; document.getElementById('add-team2').value=''; document.getElementById('add-date').value=''; await loadMatchesSplit(); }
        };

        window.openEditModal = function(matchId) {
            const m = matchesList.find(x => x.id === matchId); if (!m) return;
            document.getElementById('edit-id').value=m.id; document.getElementById('edit-team1').value=m.team1; document.getElementById('edit-team2').value=m.team2; document.getElementById('edit-date').value=toDatetimeLocal(m.match_date); document.getElementById('edit-phase').value=m.phase; document.getElementById('edit-order').value=m.order_index;
            const editDivision=document.getElementById('edit-division'); if(editDivision) editDivision.value=m.division||'A';
            const group=document.getElementById('edit-division-group'); if(group) group.style.display=m.competition==='LDN'?'flex':'none';
            document.getElementById('edit-modal').style.display='flex';
        };

        window.handleSaveEdit = async function(e) {
            e.preventDefault();
            const id=document.getElementById('edit-id').value; const team1=document.getElementById('edit-team1').value.trim(); const team2=document.getElementById('edit-team2').value.trim(); const dateVal=document.getElementById('edit-date').value; const phase=document.getElementById('edit-phase').value.trim(); const order_index=parseInt(document.getElementById('edit-order').value,10); const existing=matchesList.find(x=>x.id===id); const division=existing?.competition==='LDN'?document.getElementById('edit-division').value:null;
            const {error}=await supabaseClient.from('matches').update({team1,team2,match_date:new Date(dateVal).toISOString(),phase,order_index,division}).eq('id',id);
            if(error) showToast("Erreur : "+error.message,"error"); else {showToast("Match modifié avec succès !");closeEditModal();await loadMatchesSplit();}
        };

        window.renderMatchList = function() {
            const container=document.getElementById('match-list-container'); const filterEl=document.getElementById('filter-search'); if(!container||!filterEl)return;
            const filter=filterEl.value.toLowerCase(); const filtered=matchesList.filter(m=>m.team1.toLowerCase().includes(filter)||m.team2.toLowerCase().includes(filter)||m.phase.toLowerCase().includes(filter));
            if(!filtered.length){container.innerHTML=`<p style="text-align:center;color:var(--text-muted);padding:20px;">Aucun match trouvé pour ${currentComp==='LDN'?`la Ligue ${currentDivision}`:'cette compétition'}.</p>`;return;}
            container.innerHTML=filtered.map(m=>{const s1=m.score1??'';const s2=m.score2??'';const divBadge=m.competition==='LDN'?`<span class="admin-division-badge">Ligue ${m.division}</span>`:'';const plBadge=m.competition==='PL'?`<span class="admin-pl-badge">Premier League</span>`:'';const saBadge=m.competition==='SA'?`<span class="admin-sa-badge">Serie A</span>`:'';return `<div class="match-item"><div class="match-info"><div class="match-teams">${escapeHtml(m.team1)} vs ${escapeHtml(m.team2)}</div><div class="match-meta">${formatDateFr(m.match_date)} | ${escapeHtml(m.phase)} | Index: ${m.order_index}${divBadge}${plBadge}${saBadge}</div></div><div class="score-inputs"><input type="number" min="0" id="score1-${m.id}" value="${s1}" placeholder="-"><span>:</span><input type="number" min="0" id="score2-${m.id}" value="${s2}" placeholder="-"><button class="btn btn-success btn-sm" onclick="saveScore('${m.id}')">Score</button></div><div class="match-actions"><button class="btn btn-secondary btn-sm" onclick="openEditModal('${m.id}')">Modifier</button><button class="btn btn-danger btn-sm" onclick="deleteMatch('${m.id}')">Supprimer</button></div></div>`;}).join('');
        };

        const selector=document.querySelector('.comp-selector');
        if(selector){
            if(!selector.querySelector('[data-code="PL"]')){
                const pl=document.createElement('button'); pl.className='comp-btn'; pl.dataset.code='PL'; pl.textContent='Premier League'; pl.addEventListener('click',()=>window.selectCompetition('PL')); selector.appendChild(pl);
            }
            if(!selector.querySelector('[data-code="SA"]')){
                const sa=document.createElement('button'); sa.className='comp-btn'; sa.dataset.code='SA'; sa.textContent='Serie A'; sa.addEventListener('click',()=>window.selectCompetition('SA')); selector.appendChild(sa);
            }
            if(!document.getElementById('admin-ldn-division-switch')){
                const wrap=document.createElement('div'); wrap.id='admin-ldn-division-switch'; wrap.style.cssText='display:none;width:100%;gap:8px;align-items:center;margin-top:-8px;margin-bottom:20px;flex-wrap:wrap;';
                wrap.innerHTML=`<strong style="font-size:.78rem;color:var(--text-muted);">Ligue des Nations :</strong><button type="button" class="btn btn-secondary btn-sm" data-div="A">Ligue A</button><button type="button" class="btn btn-secondary btn-sm" data-div="B">Ligue B</button>`;
                selector.parentNode.insertBefore(wrap,selector.nextSibling);
                wrap.querySelectorAll('[data-div]').forEach(btn=>btn.addEventListener('click',()=>{currentDivision=btn.dataset.div;wrap.querySelectorAll('[data-div]').forEach(b=>b.style.outline=b===btn?'2px solid var(--primary)':'none');updateDivisionUI();loadMatchesSplit();}));
            }
        }

        updateDivisionUI(); loadMatchesSplit();
    });
})();
