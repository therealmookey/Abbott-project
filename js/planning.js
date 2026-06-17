// ===== PLANNING FUNCTIES MET DRAG & DROP =====

console.log('planning.js geladen');

document.addEventListener('DOMContentLoaded', function() {
    
    if (!window.supabase) {
        console.error('Supabase niet beschikbaar!');
        return;
    }
    
    // Vaste start- en eindlocatie (circulair)
    const START_LOCATIE = {
        adres: 'Schoonmansveld 48, 2870 Puurs',
        lat: 51.0589,
        lon: 4.2863
    };
    
    // DOM elementen
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
    const saveRouteOrderBtn = document.getElementById('saveRouteOrderBtn');
    const clearRouteOrderBtn = document.getElementById('clearRouteOrderBtn');
    
    // WhatsApp popup
    const whatsappPopup = document.getElementById('whatsappPopup');
    const closeWhatsappPopup = document.getElementById('closeWhatsappPopup');
    const sendWhatsAppBtn = document.getElementById('sendWhatsAppBtn');
    const copyBerichtBtn = document.getElementById('copyBerichtBtn');
    const whatsappBericht = document.getElementById('whatsappBericht');
    const chauffeurSelect = document.getElementById('chauffeurSelect');
    
    let currentPlanningId = null;
    let adressen = [];
    let huidigePlanningen = [];
    let sortableInstance = null;
    
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
            ophalingVelden.style.display = type === 'ophaling' ? 'block' : 'none';
            plaatsingVelden.style.display = type === 'plaatsing' ? 'block' : 'none';
        });
    }
    
    // Laad chauffeurs voor WhatsApp
    async function laadChauffeurs() {
        const { data, error } = await window.supabase
            .from('gebruikers_rollen')
            .select('user_id, gebruikersnaam, chauffeur_nummer, chauffeur_telefoon')
            .eq('is_chauffeur', true);
        
        if (error) {
            console.error('Fout bij laden chauffeurs:', error);
            return;
        }
        
        if (chauffeurSelect) {
            chauffeurSelect.innerHTML = '<option value="">Selecteer een chauffeur...</option>';
            data.forEach(chauffeur => {
                const option = document.createElement('option');
                option.value = chauffeur.chauffeur_telefoon || '';
                option.textContent = `${chauffeur.gebruikersnaam || 'Chauffeur'} - ${chauffeur.chauffeur_telefoon || 'geen telefoon'}`;
                chauffeurSelect.appendChild(option);
            });
        }
    }
    
    // Laad planningen met drag & drop
    async function laadPlanningen() {
        if (!planningLijst) return;
        
        planningLijst.innerHTML = '<p>Laden...</p>';
        
        let query = window.supabase
            .from('planningen')
            .select(`
                *,
                adres:adres_id (id, instelling_naam, straat, postcode, plaats, telefoon, extra_info)
            `)
            .order('datum', { ascending: true })
            .order('route_volgorde', { ascending: true });
        
        if (typeFilter?.value && typeFilter.value !== 'alles') query = query.eq('type', typeFilter.value);
        if (statusFilter?.value && statusFilter.value !== 'alles') query = query.eq('status', statusFilter.value);
        if (datumFilter?.value) query = query.eq('datum', datumFilter.value);
        
        const { data, error } = await query;
        
        if (error) {
            planningLijst.innerHTML = `<p class="error">Fout bij laden: ${error.message}</p>`;
            return;
        }
        
        if (!data || data.length === 0) {
            planningLijst.innerHTML = '<p>Geen planningen gevonden.</p>';
            return;
        }
        
        huidigePlanningen = data;
        planningLijst.innerHTML = '';
        
        // Toon de planningen in de huidige volgorde
        for (const planning of data) {
            const item = document.createElement('div');
            item.className = 'planning-item sortable-item';
            item.dataset.id = planning.id;
            item.dataset.volgorde = planning.route_volgorde || 0;
            
            // Bepaal status class
            let statusClass = planning.status === 'gepland' ? 'status-gepland' : 
                             (planning.status === 'uitgevoerd' ? 'status-uitgevoerd' : 'status-geannuleerd');
            
            // Extra info voor type
            let extraInfo = '';
            if (planning.type === 'ophaling' && planning.aantal_tonnen) {
                extraInfo = `<p>📦 <strong>Aantal volle tonnen:</strong> ${planning.aantal_tonnen} stuks</p>`;
            } else if (planning.type === 'plaatsing' && planning.aantal_lege_tonnen) {
                extraInfo = `<p>🚚 <strong>Aantal lege tonnen meenemen:</strong> ${planning.aantal_lege_tonnen} stuks</p>`;
            }
            
            // Extra info weergeven
            let extraInfoText = '';
            if (planning.adres?.extra_info) {
                extraInfoText = `<p class="adres-extra-info">📝 ${escapeHtml(planning.adres.extra_info)}</p>`;
            }
            
            // Telefoon weergeven
            let telefoonText = '';
            if (planning.adres?.telefoon) {
                telefoonText = `<p>📞 ${escapeHtml(planning.adres.telefoon)}</p>`;
            }
            
            // Volgnummer (voor drag & drop visualisatie)
            const volgnummer = planning.route_volgorde || (data.indexOf(planning) + 1);
            
            item.innerHTML = `
                <div class="planning-info">
                    <div class="planning-header">
                        <span class="drag-handle">⠿</span>
                        <span class="stop-number-badge">#${volgnummer}</span>
                        <h4>${planning.type === 'ophaling' ? '📦 Ophaling' : '🚚 Plaatsing'}</h4>
                        <span class="planning-status ${statusClass}">${getStatusText(planning.status)}</span>
                    </div>
                    <p><strong>${escapeHtml(planning.adres?.instelling_naam || 'Onbekend')}</strong></p>
                    <p>📍 ${escapeHtml(planning.adres?.straat || '')}, ${escapeHtml(planning.adres?.postcode || '')} ${escapeHtml(planning.adres?.plaats || '')}</p>
                    <p>📅 ${new Date(planning.datum).toLocaleDateString('nl-NL')}</p>
                    ${telefoonText}
                    ${extraInfo}
                    ${extraInfoText}
                    ${planning.opmerkingen ? `<p>📝 ${escapeHtml(planning.opmerkingen)}</p>` : ''}
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
        }
        
        // Event listeners voor status, bewerken, verwijderen
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', (e) => updateStatus(e.target.dataset.id, e.target.value));
        });
        document.querySelectorAll('.edit-planning-btn').forEach(btn => {
            btn.addEventListener('click', () => bewerkPlanning(btn.dataset.id));
        });
        document.querySelectorAll('.delete-planning-btn').forEach(btn => {
            btn.addEventListener('click', () => verwijderPlanning(btn.dataset.id));
        });
        
        // Initialiseer SortableJS voor drag & drop
        initSortable();
    }
    
    // Initialiseer SortableJS
    function initSortable() {
        const list = document.getElementById('planningLijst');
        if (!list) return;
        
        // Vernietig bestaande instance als die er is
        if (sortableInstance) {
            sortableInstance.destroy();
        }
        
        sortableInstance = new Sortable(list, {
            handle: '.drag-handle',
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            onEnd: function(evt) {
                updateStopNumbers();
                // Markeer dat de volgorde is gewijzigd
                document.getElementById('saveRouteOrderBtn').style.display = 'inline-block';
            }
        });
    }
    
    // Update de stop nummers na drag & drop
    function updateStopNumbers() {
        const items = document.querySelectorAll('#planningLijst .planning-item');
        items.forEach((item, index) => {
            const badge = item.querySelector('.stop-number-badge');
            if (badge) {
                badge.textContent = `#${index + 1}`;
            }
            // Update dataset volgorde
            item.dataset.volgorde = index + 1;
        });
    }
    
    // Sla de route volgorde op in de database
    async function saveRouteOrder() {
        const items = document.querySelectorAll('#planningLijst .planning-item');
        const updates = [];
        
        items.forEach((item, index) => {
            const id = parseInt(item.dataset.id);
            const volgorde = index + 1;
            updates.push({ id, volgorde });
        });
        
        if (updates.length === 0) {
            alert('Geen planningen om op te slaan.');
            return;
        }
        
        try {
            for (const update of updates) {
                const { error } = await window.supabase
                    .from('planningen')
                    .update({ route_volgorde: update.volgorde })
                    .eq('id', update.id);
                
                if (error) throw error;
            }
            
            alert('Route volgorde succesvol opgeslagen!');
            document.getElementById('saveRouteOrderBtn').style.display = 'none';
            
            // Herlaad de planningen
            laadPlanningen();
            
        } catch (err) {
            alert('Fout bij opslaan: ' + err.message);
        }
    }
    
    // Reset de route volgorde
    async function resetRouteOrder() {
        if (!confirm('Weet je zeker dat je de route volgorde wilt resetten?')) return;
        
        try {
            const { error } = await window.supabase
                .from('planningen')
                .update({ route_volgorde: 0 })
                .neq('id', 0);
            
            if (error) throw error;
            
            alert('Route volgorde gereset!');
            laadPlanningen();
            
        } catch (err) {
            alert('Fout bij resetten: ' + err.message);
        }
    }
    
    // Update status
    async function updateStatus(id, nieuweStatus) {
        const { error } = await window.supabase.from('planningen').update({ status: nieuweStatus }).eq('id', id);
        if (error) alert('Fout: ' + error.message);
        else laadPlanningen();
    }
    
    // Verwijder planning
    async function verwijderPlanning(id) {
        if (!confirm('Weet je zeker dat je deze planning wilt verwijderen?')) return;
        const { error } = await window.supabase.from('planningen').delete().eq('id', id);
        if (error) alert('Fout: ' + error.message);
        else laadPlanningen();
    }
    
    // Bewerk planning
    async function bewerkPlanning(id) {
        const { data, error } = await window.supabase.from('planningen').select('*').eq('id', id).single();
        if (error) { alert('Fout: ' + error.message); return; }
        
        currentPlanningId = id;
        planningPopupTitle.textContent = 'Planning bewerken';
        await laadAdressen();
        vulAdresDropdown();
        
        typeSelect.value = data.type;
        adresSelect.value = data.adres_id;
        document.getElementById('planningDatum').value = data.datum;
        document.getElementById('aantalTonnen').value = data.aantal_tonnen || 1;
        document.getElementById('aantalLegeTonnen').value = data.aantal_lege_tonnen || 1;
        document.getElementById('opmerkingen').value = data.opmerkingen || '';
        
        ophalingVelden.style.display = data.type === 'ophaling' ? 'block' : 'none';
        plaatsingVelden.style.display = data.type === 'plaatsing' ? 'block' : 'none';
        planningPopup.style.display = 'flex';
    }
    
    // Nieuwe planning
    if (newPlanningBtn) {
        newPlanningBtn.addEventListener('click', async () => {
            currentPlanningId = null;
            planningPopupTitle.textContent = 'Nieuwe planning';
            await laadAdressen();
            vulAdresDropdown();
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
                alert('Vul alle verplichte velden in');
                return;
            }
            
            const planningData = { 
                adres_id: parseInt(adresId), 
                type, 
                datum, 
                opmerkingen: opmerkingen || null, 
                status: 'gepland',
                route_volgorde: 0 // Standaard volgorde, wordt later aangepast
            };
            
            if (type === 'ophaling') planningData.aantal_tonnen = parseInt(aantalTonnen) || 1;
            if (type === 'plaatsing') planningData.aantal_lege_tonnen = parseInt(aantalLegeTonnen) || 1;
            
            let error;
            if (currentPlanningId) {
                const result = await window.supabase.from('planningen').update(planningData).eq('id', currentPlanningId);
                error = result.error;
            } else {
                const result = await window.supabase.from('planningen').insert([planningData]);
                error = result.error;
            }
            
            if (error) alert('Fout: ' + error.message);
            else { planningPopup.style.display = 'none'; laadPlanningen(); }
        });
    }
    
    if (closePlanningPopup) closePlanningPopup.addEventListener('click', () => planningPopup.style.display = 'none');
    if (filterBtn) filterBtn.addEventListener('click', laadPlanningen);
    if (saveRouteOrderBtn) saveRouteOrderBtn.addEventListener('click', saveRouteOrder);
    if (clearRouteOrderBtn) clearRouteOrderBtn.addEventListener('click', resetRouteOrder);
    
    // WhatsApp functies
    if (sendWhatsAppBtn) {
        sendWhatsAppBtn.addEventListener('click', () => {
            const telefoon = chauffeurSelect?.value;
            const bericht = whatsappBericht?.value;
            
            if (!telefoon) {
                alert('Selecteer een chauffeur met een geldig telefoonnummer.');
                return;
            }
            
            let nummer = telefoon.replace(/\s/g, '').replace(/^0/, '32');
            if (!nummer.startsWith('+')) nummer = '+' + nummer;
            
            const whatsappUrl = `https://wa.me/${nummer}?text=${encodeURIComponent(bericht)}`;
            window.open(whatsappUrl, '_blank');
        });
    }
    
    if (copyBerichtBtn) {
        copyBerichtBtn.addEventListener('click', () => {
            whatsappBericht.select();
            document.execCommand('copy');
            alert('Bericht gekopieerd!');
        });
    }
    
    if (closeWhatsappPopup) {
        closeWhatsappPopup.addEventListener('click', () => {
            whatsappPopup.style.display = 'none';
        });
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === planningPopup) planningPopup.style.display = 'none';
        if (e.target === whatsappPopup) whatsappPopup.style.display = 'none';
    });
    
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
    
    // Initialiseer
    laadPlanningen();
    laadChauffeurs();
    
});