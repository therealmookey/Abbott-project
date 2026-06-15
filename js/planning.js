// ===== PLANNING FUNCTIES (MET TONNEN) =====

console.log('planning.js geladen');

document.addEventListener('DOMContentLoaded', function() {
    
    if (!window.supabase) {
        console.error('Supabase niet beschikbaar!');
        return;
    }
    
    console.log('Planning pagina geladen');
    
    const planningLijst = document.getElementById('planningLijst');
    const newPlanningBtn = document.getElementById('newPlanningBtn');
    const planningPopup = document.getElementById('planningPopup');
    const savePlanningBtn = document.getElementById('savePlanningBtn');
    const closePlanningPopup = document.getElementById('closePlanningPopup');
    const planningPopupTitle = document.getElementById('planningPopupTitle');
    const adresSelect = document.getElementById('adresSelect');
    const typeSelect = document.getElementById('typeSelect');
    const ophalingVelden = document.getElementById('ophalingVelden');
    const plaatsingVelden = document.getElementById('plaatsingVelden');
    const statusFilter = document.getElementById('statusFilter');
    const typeFilter = document.getElementById('typeFilter');
    const datumFilter = document.getElementById('datumFilter');
    const filterBtn = document.getElementById('filterBtn');
    
    let currentPlanningId = null;
    let adressen = [];
    
    // Laad adressen voor dropdown
    async function laadAdressen() {
        const { data, error } = await window.supabase
            .from('adressen')
            .select('id, instelling_naam, straat, postcode, plaats')
            .order('instelling_naam');
        
        if (error) {
            console.error('Fout bij laden adressen:', error);
            return [];
        }
        adressen = data || [];
        return adressen;
    }
    
    function vulAdresDropdown() {
        if (!adresSelect) return;
        
        adresSelect.innerHTML = '<option value="">Kies een adres...</option>';
        adressen.forEach(adres => {
            const option = document.createElement('option');
            option.value = adres.id;
            option.textContent = `${adres.instelling_naam} - ${adres.straat}, ${adres.plaats}`;
            adresSelect.appendChild(option);
        });
    }
    
    // Toon/verberg velden op basis van type
    if (typeSelect) {
        typeSelect.addEventListener('change', (e) => {
            const type = e.target.value;
            if (type === 'ophaling') {
                ophalingVelden.style.display = 'block';
                plaatsingVelden.style.display = 'none';
            } else if (type === 'plaatsing') {
                ophalingVelden.style.display = 'none';
                plaatsingVelden.style.display = 'block';
            } else {
                ophalingVelden.style.display = 'none';
                plaatsingVelden.style.display = 'none';
            }
        });
    }
    
    // Laad planningen
    async function laadPlanningen() {
        if (!planningLijst) return;
        
        planningLijst.innerHTML = '<p>Laden...</p>';
        
        let query = window.supabase
            .from('planningen')
            .select(`
                *,
                adres:adres_id (id, instelling_naam, straat, postcode, plaats)
            `)
            .order('datum', { ascending: true });
        
        if (typeFilter && typeFilter.value !== 'alles') {
            query = query.eq('type', typeFilter.value);
        }
        
        if (statusFilter && statusFilter.value !== 'alles') {
            query = query.eq('status', statusFilter.value);
        }
        
        if (datumFilter && datumFilter.value) {
            query = query.eq('datum', datumFilter.value);
        }
        
        const { data, error } = await query;
        
        if (error) {
            planningLijst.innerHTML = `<p class="error">Fout bij laden: ${error.message}</p>`;
            return;
        }
        
        if (!data || data.length === 0) {
            planningLijst.innerHTML = '<p>Geen planningen gevonden. Klik op "+ Nieuwe planning" om er een toe te voegen.</p>';
            return;
        }
        
        planningLijst.innerHTML = '';
        data.forEach(planning => {
            const item = document.createElement('div');
            item.className = 'planning-item';
            
            let statusClass = '';
            if (planning.status === 'gepland') statusClass = 'status-gepland';
            else if (planning.status === 'uitgevoerd') statusClass = 'status-uitgevoerd';
            else if (planning.status === 'geannuleerd') statusClass = 'status-geannuleerd';
            
            // Toon extra info op basis van type
            let extraInfo = '';
            if (planning.type === 'ophaling' && planning.aantal_tonnen) {
                extraInfo = `<p>📦 <strong>Aantal volle tonnen:</strong> ${planning.aantal_tonnen} stuks</p>`;
            } else if (planning.type === 'plaatsing' && planning.aantal_lege_tonnen) {
                extraInfo = `<p>🚚 <strong>Aantal lege tonnen meenemen:</strong> ${planning.aantal_lege_tonnen} stuks</p>`;
            }
            
            item.innerHTML = `
                <div class="planning-info">
                    <h4>${planning.type === 'ophaling' ? '📦 Ophaling' : '🚚 Plaatsing'}</h4>
                    <p><strong>${escapeHtml(planning.adres?.instelling_naam || 'Onbekend')}</strong></p>
                    <p>📍 ${escapeHtml(planning.adres?.straat || '')}, ${escapeHtml(planning.adres?.postcode || '')} ${escapeHtml(planning.adres?.plaats || '')}</p>
                    <p>📅 ${formatDate(planning.datum)}</p>
                    ${extraInfo}
                    ${planning.opmerkingen ? `<p>📝 ${escapeHtml(planning.opmerkingen)}</p>` : ''}
                    <span class="planning-status ${statusClass}">${getStatusText(planning.status)}</span>
                </div>
                <div class="planning-buttons">
                    <select class="status-select" data-id="${planning.id}">
                        <option value="gepland" ${planning.status === 'gepland' ? 'selected' : ''}>Gepland</option>
                        <option value="uitgevoerd" ${planning.status === 'uitgevoerd' ? 'selected' : ''}>Uitgevoerd</option>
                        <option value="geannuleerd" ${planning.status === 'geannuleerd' ? 'selected' : ''}>Geannuleerd</option>
                    </select>
                    <button class="btn btn-secondary edit-planning-btn" data-id="${planning.id}">✏️</button>
                    <button class="btn btn-danger delete-planning-btn" data-id="${planning.id}">🗑️</button>
                </div>
            `;
            planningLijst.appendChild(item);
        });
        
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', (e) => updateStatus(e.target.dataset.id, e.target.value));
        });
        document.querySelectorAll('.edit-planning-btn').forEach(btn => {
            btn.addEventListener('click', () => bewerkPlanning(btn.dataset.id));
        });
        document.querySelectorAll('.delete-planning-btn').forEach(btn => {
            btn.addEventListener('click', () => verwijderPlanning(btn.dataset.id));
        });
    }
    
    async function updateStatus(id, nieuweStatus) {
        const { error } = await window.supabase
            .from('planningen')
            .update({ status: nieuweStatus })
            .eq('id', id);
        
        if (error) {
            alert('Fout bij updaten status: ' + error.message);
        } else {
            laadPlanningen();
        }
    }
    
    // Nieuwe planning
    if (newPlanningBtn) {
        newPlanningBtn.addEventListener('click', async () => {
            await laadAdressen();
            vulAdresDropdown();
            currentPlanningId = null;
            planningPopupTitle.textContent = 'Nieuwe planning';
            typeSelect.value = '';
            adresSelect.value = '';
            document.getElementById('planningDatum').value = '';
            document.getElementById('aantalTonnen').value = '1';
            document.getElementById('aantalLegeTonnen').value = '1';
            document.getElementById('opmerkingen').value = '';
            ophalingVelden.style.display = 'none';
            plaatsingVelden.style.display = 'none';
            planningPopup.style.display = 'flex';
        });
    }
    
    // Planning bewerken
    async function bewerkPlanning(id) {
        await laadAdressen();
        vulAdresDropdown();
        
        const { data, error } = await window.supabase
            .from('planningen')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) {
            alert('Fout bij laden: ' + error.message);
            return;
        }
        
        currentPlanningId = id;
        planningPopupTitle.textContent = 'Planning bewerken';
        typeSelect.value = data.type;
        adresSelect.value = data.adres_id;
        document.getElementById('planningDatum').value = data.datum;
        document.getElementById('aantalTonnen').value = data.aantal_tonnen || '1';
        document.getElementById('aantalLegeTonnen').value = data.aantal_lege_tonnen || '1';
        document.getElementById('opmerkingen').value = data.opmerkingen || '';
        
        // Toon juiste velden
        if (data.type === 'ophaling') {
            ophalingVelden.style.display = 'block';
            plaatsingVelden.style.display = 'none';
        } else if (data.type === 'plaatsing') {
            ophalingVelden.style.display = 'none';
            plaatsingVelden.style.display = 'block';
        }
        
        planningPopup.style.display = 'flex';
    }
    
    // Opslaan planning
    if (savePlanningBtn) {
        savePlanningBtn.addEventListener('click', async () => {
            const type = typeSelect?.value;
            const adresId = adresSelect?.value;
            const datum = document.getElementById('planningDatum')?.value;
            const aantalTonnen = document.getElementById('aantalTonnen')?.value;
            const aantalLegeTonnen = document.getElementById('aantalLegeTonnen')?.value;
            const opmerkingen = document.getElementById('opmerkingen')?.value;
            
            if (!type || !adresId || !datum) {
                alert('Vul alle verplichte velden in (type, adres, datum)');
                return;
            }
            
            const planningData = {
                adres_id: parseInt(adresId),
                type: type,
                datum: datum,
                opmerkingen: opmerkingen || null,
                status: 'gepland'
            };
            
            // Voeg type-specifieke velden toe
            if (type === 'ophaling') {
                planningData.aantal_tonnen = parseInt(aantalTonnen) || 1;
            } else if (type === 'plaatsing') {
                planningData.aantal_lege_tonnen = parseInt(aantalLegeTonnen) || 1;
            }
            
            try {
                let error;
                if (currentPlanningId) {
                    const result = await window.supabase
                        .from('planningen')
                        .update(planningData)
                        .eq('id', currentPlanningId);
                    error = result.error;
                } else {
                    const result = await window.supabase
                        .from('planningen')
                        .insert([planningData]);
                    error = result.error;
                }
                
                if (error) {
                    alert('Fout bij opslaan: ' + error.message);
                } else {
                    planningPopup.style.display = 'none';
                    laadPlanningen();
                }
            } catch (err) {
                alert('Fout: ' + err.message);
            }
        });
    }
    
    // Planning verwijderen
    async function verwijderPlanning(id) {
        if (!confirm('Weet je zeker dat je deze planning wilt verwijderen?')) return;
        
        const { error } = await window.supabase
            .from('planningen')
            .delete()
            .eq('id', id);
        
        if (error) {
            alert('Fout bij verwijderen: ' + error.message);
        } else {
            laadPlanningen();
        }
    }
    
    // Filters
    if (filterBtn) {
        filterBtn.addEventListener('click', laadPlanningen);
    }
    
    // Popup sluiten
    if (closePlanningPopup) {
        closePlanningPopup.addEventListener('click', () => {
            planningPopup.style.display = 'none';
        });
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === planningPopup) {
            planningPopup.style.display = 'none';
        }
    });
    
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('nl-NL');
    }
    
    function getStatusText(status) {
        switch(status) {
            case 'gepland': return 'Gepland';
            case 'uitgevoerd': return 'Uitgevoerd';
            case 'geannuleerd': return 'Geannuleerd';
            default: return status;
        }
    }
    
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    async function init() {
        await laadAdressen();
        laadPlanningen();
    }
    
    init();
    
});