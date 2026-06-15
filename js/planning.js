// ===== PLANNING FUNCTIES MET ROUTE PLANNER =====

console.log('planning.js geladen');

document.addEventListener('DOMContentLoaded', function() {
    
    if (!window.supabase) {
        console.error('Supabase niet beschikbaar!');
        return;
    }
    
    // Vaste startlocatie
    const START_LOCATIE = {
        adres: 'Schoonmansveld 48, 2870 Puurs',
        lat: 51.0589,
        lon: 4.2863
    };
    
    // DOM elementen - Planning tab
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
    
    // DOM elementen - Route tab
    const routeDatumInput = document.getElementById('routeDatum');
    const laadRouteBtn = document.getElementById('laadRouteBtn');
    const laadKomendeBtn = document.getElementById('laadKomendeBtn');
    const routeResultaat = document.getElementById('routeResultaat');
    const chauffeurSelect = document.getElementById('chauffeurSelect');
    
    // DOM elementen - WhatsApp popup
    const whatsappPopup = document.getElementById('whatsappPopup');
    const closeWhatsappPopup = document.getElementById('closeWhatsappPopup');
    const sendWhatsAppBtn = document.getElementById('sendWhatsAppBtn');
    const copyBerichtBtn = document.getElementById('copyBerichtBtn');
    const whatsappBericht = document.getElementById('whatsappBericht');
    
    let currentPlanningId = null;
    let adressen = [];
    let huidigeRouteData = null;
    
    // Zet vandaag als default datum voor route planner
    if (routeDatumInput) {
        const vandaag = new Date().toISOString().split('T')[0];
        routeDatumInput.value = vandaag;
    }
    
    // Tab functionaliteit
    const tabButtons = document.querySelectorAll('.planning-tabs .tab-btn');
    const tabs = document.querySelectorAll('.planning-tab');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            tabs.forEach(tab => tab.classList.remove('active'));
            
            if (tabId === 'planning') {
                document.getElementById('tabPlanning').classList.add('active');
                laadPlanningen();
            } else if (tabId === 'route') {
                document.getElementById('tabRoute').classList.add('active');
                laadChauffeurs();
                if (routeDatumInput.value) {
                    berekenRouteVoorDatum(routeDatumInput.value);
                }
            }
        });
    });
    
    // Haal chauffeurs op
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
    
    // Coördinaten ophalen via Nominatim
    async function haalCoordinatenOp(adresString) {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(adresString + ', België')}&limit=1`;
        try {
            const response = await fetch(url, {
                headers: { 'User-Agent': 'Abbott-Route-Planner/1.0' }
            });
            const data = await response.json();
            if (data && data.length > 0) {
                return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
            }
        } catch (error) {
            console.error('Fout bij ophalen coördinaten:', error);
        }
        return null;
    }
    
    // Afstand berekenen (Haversine formule)
    function berekenAfstand(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    // Optimaliseer route (greedy algoritme)
    async function optimaliseerRoute(adressenList, startLat, startLon) {
        if (!adressenList || adressenList.length === 0) return [];
        
        const adressenMetCoords = [];
        for (const adres of adressenList) {
            const zoekTerm = `${adres.straat}, ${adres.postcode} ${adres.plaats}`;
            const coords = await haalCoordinatenOp(zoekTerm);
            adressenMetCoords.push({ ...adres, lat: coords?.lat, lon: coords?.lon });
        }
        
        const metCoords = adressenMetCoords.filter(a => a.lat && a.lon);
        const zonderCoords = adressenMetCoords.filter(a => !a.lat || !a.lon);
        
        if (metCoords.length === 0) return adressenList;
        
        let huidigeLat = startLat;
        let huidigeLon = startLon;
        const ongeordend = [...metCoords];
        const geordend = [];
        
        while (ongeordend.length > 0) {
            let dichtstbijIndex = 0;
            let kortsteAfstand = Infinity;
            
            for (let i = 0; i < ongeordend.length; i++) {
                if (ongeordend[i].lat && ongeordend[i].lon) {
                    const afstand = berekenAfstand(huidigeLat, huidigeLon, ongeordend[i].lat, ongeordend[i].lon);
                    if (afstand < kortsteAfstand) {
                        kortsteAfstand = afstand;
                        dichtstbijIndex = i;
                    }
                }
            }
            
            const volgende = ongeordend[dichtstbijIndex];
            geordend.push(volgende);
            huidigeLat = volgende.lat;
            huidigeLon = volgende.lon;
            ongeordend.splice(dichtstbijIndex, 1);
        }
        
        return [...geordend, ...zonderCoords];
    }
    
    // Route berekenen voor een datum
    async function berekenRouteVoorDatum(datum) {
        if (!routeResultaat) return;
        
        routeResultaat.innerHTML = '<p>Bezig met laden en optimaliseren...</p>';
        
        const { data: planningen, error } = await window.supabase
            .from('planningen')
            .select(`
                *,
                adres:adres_id (id, instelling_naam, straat, postcode, plaats, telefoon, extra_info)
            `)
            .eq('datum', datum)
            .eq('status', 'gepland')
            .order('type', { ascending: true });
        
        if (error) {
            routeResultaat.innerHTML = `<p class="error">Fout: ${error.message}</p>`;
            return;
        }
        
        if (!planningen || planningen.length === 0) {
            routeResultaat.innerHTML = '<p>Geen geplande ritten voor deze datum.</p>';
            return;
        }
        
        const adressenList = [];
        for (const planning of planningen) {
            if (planning.adres) {
                adressenList.push({
                    id: planning.id,
                    planning_id: planning.id,
                    instelling_naam: planning.adres.instelling_naam,
                    straat: planning.adres.straat,
                    postcode: planning.adres.postcode,
                    plaats: planning.adres.plaats,
                    telefoon: planning.adres.telefoon,
                    extra_info: planning.adres.extra_info,
                    type: planning.type,
                    aantal_tonnen: planning.aantal_tonnen,
                    aantal_lege_tonnen: planning.aantal_lege_tonnen,
                    opmerkingen: planning.opmerkingen
                });
            }
        }
        
        const geoptimaliseerd = await optimaliseerRoute(adressenList, START_LOCATIE.lat, START_LOCATIE.lon);
        huidigeRouteData = { planningen: geoptimaliseerd, datum: datum };
        
        let html = `
            <div class="route-overview">
                <div class="route-header-summary">
                    <h4>🗺️ Route voor ${new Date(datum).toLocaleDateString('nl-NL')}</h4>
                    <p><strong>📍 Vertrek:</strong> ${START_LOCATIE.adres}</p>
                    <p><strong>📋 Aantal stops:</strong> ${geoptimaliseerd.length}</p>
                </div>
                <div class="route-stops-list">
        `;
        
        geoptimaliseerd.forEach((stop, index) => {
            let typeInfo = '';
            if (stop.type === 'ophaling') {
                typeInfo = `📦 OPHALING - ${stop.aantal_tonnen || 1} volle ton(nen) ophalen`;
            } else if (stop.type === 'plaatsing') {
                typeInfo = `🚚 PLAATSING - ${stop.aantal_lege_tonnen || 1} lege ton(nen) afleveren`;
            }
            
            html += `
                <div class="route-stop">
                    <div class="stop-number">${index + 1}</div>
                    <div class="stop-details">
                        <strong>${escapeHtml(stop.instelling_naam)}</strong><br>
                        📍 ${escapeHtml(stop.straat)}<br>
                        📮 ${escapeHtml(stop.postcode)} ${escapeHtml(stop.plaats)}<br>
                        <span class="stop-type">${typeInfo}</span>
                        ${stop.opmerkingen ? `<div class="stop-opmerking">📝 ${escapeHtml(stop.opmerkingen)}</div>` : ''}
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
                <div class="route-actions-bottom">
                    <button id="genereerWhatsAppBtn" class="btn btn-primary">📱 Genereer WhatsApp bericht</button>
                    <button id="markeerUitgevoerdBtn" class="btn btn-secondary">✅ Markeer alle als uitgevoerd</button>
                </div>
            </div>
        `;
        
        routeResultaat.innerHTML = html;
        
        document.getElementById('genereerWhatsAppBtn')?.addEventListener('click', () => toonWhatsappPopup());
        document.getElementById('markeerUitgevoerdBtn')?.addEventListener('click', () => markeerAllesUitgevoerd(planningen));
    }
    
    // Markeer alle planningen als uitgevoerd
    async function markeerAllesUitgevoerd(planningen) {
        if (!confirm(`Weet je zeker dat je alle ${planningen.length} ritten wilt markeren als uitgevoerd?`)) return;
        
        let successCount = 0;
        for (const planning of planningen) {
            const { error } = await window.supabase
                .from('planningen')
                .update({ status: 'uitgevoerd' })
                .eq('id', planning.id);
            if (!error) successCount++;
        }
        
        alert(`${successCount} van de ${planningen.length} ritten gemarkeerd als uitgevoerd.`);
        berekenRouteVoorDatum(huidigeRouteData?.datum);
        laadPlanningen();
    }
    
    // Toon WhatsApp popup
    function toonWhatsappPopup() {
        if (!huidigeRouteData || !huidigeRouteData.planningen || huidigeRouteData.planningen.length === 0) {
            alert('Geen route data beschikbaar.');
            return;
        }
        
        const chauffeurTel = chauffeurSelect?.value;
        if (!chauffeurTel) {
            alert('Selecteer eerst een chauffeur.');
            return;
        }
        
        const datum = new Date(huidigeRouteData.datum).toLocaleDateString('nl-NL');
        let bericht = `🚚 *ABBOTT ROUTE PLANNING* 🚚\n\n`;
        bericht += `📅 *Datum:* ${datum}\n`;
        bericht += `📍 *Vertrek:* Schoonmansveld 48, 2870 Puurs\n\n`;
        bericht += `*📋 ROUTE (${huidigeRouteData.planningen.length} stops)*\n`;
        bericht += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        huidigeRouteData.planningen.forEach((stop, index) => {
            bericht += `${index + 1}. *${stop.instelling_naam}*\n`;
            bericht += `   📍 ${stop.straat}\n`;
            bericht += `   📮 ${stop.postcode} ${stop.plaats}\n`;
            if (stop.type === 'ophaling') {
                bericht += `   📦 OPHALING: ${stop.aantal_tonnen || 1} volle ton(nen)\n`;
            } else if (stop.type === 'plaatsing') {
                bericht += `   🚚 PLAATSING: ${stop.aantal_lege_tonnen || 1} lege ton(nen)\n`;
            }
            if (stop.opmerkingen) {
                bericht += `   📝 ${stop.opmerkingen}\n`;
            }
            if (stop.telefoon) {
                bericht += `   📞 Contact: ${stop.telefoon}\n`;
            }
            bericht += `\n`;
        });
        
        bericht += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        bericht += `🗺️ Open in Google Maps:\n`;
        bericht += `https://www.google.com/maps/dir/Schoonmansveld+48,+2870+Puurs/`;
        
        const adressenVoorRoute = huidigeRouteData.planningen.map(stop => 
            encodeURIComponent(`${stop.straat}, ${stop.postcode} ${stop.plaats}`)
        );
        bericht += adressenVoorRoute.join('/');
        
        if (whatsappBericht) whatsappBericht.value = bericht;
        whatsappPopup.style.display = 'flex';
    }
    
    // WhatsApp versturen
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
    
    // Laad alle planningen (bestaande functie)
    async function laadPlanningen() {
        if (!planningLijst) return;
        
        planningLijst.innerHTML = '<p>Laden...</p>';
        
        let query = window.supabase
            .from('planningen')
            .select(`*, adres:adres_id (id, instelling_naam, straat, postcode, plaats)`)
            .order('datum', { ascending: true });
        
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
        
        planningLijst.innerHTML = '';
        for (const planning of data) {
            const item = document.createElement('div');
            item.className = 'planning-item';
            
            let statusClass = planning.status === 'gepland' ? 'status-gepland' : (planning.status === 'uitgevoerd' ? 'status-uitgevoerd' : 'status-geannuleerd');
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
                    <p>📅 ${new Date(planning.datum).toLocaleDateString('nl-NL')}</p>
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
        }
        
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
        const { error } = await window.supabase.from('planningen').update({ status: nieuweStatus }).eq('id', id);
        if (error) alert('Fout: ' + error.message);
        else laadPlanningen();
    }
    
    async function verwijderPlanning(id) {
        if (!confirm('Weet je zeker dat je deze planning wilt verwijderen?')) return;
        const { error } = await window.supabase.from('planningen').delete().eq('id', id);
        if (error) alert('Fout: ' + error.message);
        else laadPlanningen();
    }
    
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
            
            const planningData = { adres_id: parseInt(adresId), type, datum, opmerkingen: opmerkingen || null, status: 'gepland' };
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
    if (laadRouteBtn) laadRouteBtn.addEventListener('click', () => berekenRouteVoorDatum(routeDatumInput.value));
    if (laadKomendeBtn) {
        laadKomendeBtn.addEventListener('click', () => {
            const vandaag = new Date().toISOString().split('T')[0];
            routeDatumInput.value = vandaag;
            berekenRouteVoorDatum(vandaag);
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
    
});