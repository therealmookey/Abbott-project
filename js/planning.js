// ===== PLANNING FUNCTIES - 1 LIJST OP DATUM MET CHAUFFEUR PER DAG & AI =====

console.log('planning.js geladen');

document.addEventListener('DOMContentLoaded', function() {
    
    if (!window.supabase) {
        console.error('Supabase niet beschikbaar!');
        return;
    }
    
    // Vaste start- en eindlocatie
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
    
    // WhatsApp popup
    const whatsappPopup = document.getElementById('whatsappPopup');
    const closeWhatsappPopup = document.getElementById('closeWhatsappPopup');
    const sendWhatsAppBtn = document.getElementById('sendWhatsAppBtn');
    const copyBerichtBtn = document.getElementById('copyBerichtBtn');
    const whatsappBericht = document.getElementById('whatsappBericht');
    
    let currentPlanningId = null;
    let adressen = [];
    let allePlanningen = [];
    let chauffeurs = [];
    let sortableInstance = null;
    let huidigeWhatsAppDatum = '';
    
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
    
    // Laad chauffeurs
    async function laadChauffeurs() {
        const { data, error } = await window.supabase
            .from('gebruikers_rollen')
            .select('user_id, gebruikersnaam, chauffeur_nummer, chauffeur_telefoon')
            .eq('is_chauffeur', true);
        
        if (error) {
            console.error('Fout bij laden chauffeurs:', error);
            return;
        }
        
        chauffeurs = data || [];
    }
    
    // Toon/verberg velden op basis van type
    if (typeSelect) {
        typeSelect.addEventListener('change', (e) => {
            const type = e.target.value;
            ophalingVelden.style.display = type === 'ophaling' ? 'block' : 'none';
            plaatsingVelden.style.display = type === 'plaatsing' ? 'block' : 'none';
        });
    }
    
    // Genereer chauffeur dropdown HTML
    function generateChauffeurDropdown(selectedValue) {
        let html = '<select class="chauffeur-select" data-datum="">';
        html += '<option value="">Geen chauffeur geselecteerd</option>';
        
        for (const chauffeur of chauffeurs) {
            const selected = chauffeur.chauffeur_telefoon === selectedValue ? 'selected' : '';
            const label = `${chauffeur.gebruikersnaam || 'Chauffeur'} - ${chauffeur.chauffeur_telefoon || 'geen telefoon'}`;
            html += `<option value="${chauffeur.chauffeur_telefoon || ''}" ${selected}>${label}</option>`;
        }
        html += '</select>';
        return html;
    }
    
    // Sla chauffeur keuze op in localStorage per datum
    function saveChauffeurForDate(datum, chauffeurTelefoon) {
        const key = `chauffeur_${datum}`;
        if (chauffeurTelefoon) {
            localStorage.setItem(key, chauffeurTelefoon);
        } else {
            localStorage.removeItem(key);
        }
    }
    
    function getChauffeurForDate(datum) {
        const key = `chauffeur_${datum}`;
        return localStorage.getItem(key) || '';
    }
    
    // ===== AI OPTIMALISATIE (Directe API Call met Gemma) =====
    async function optimaliseerMetAI(datum) {
        // Verzamel alle adressen voor deze datum
        const items = document.querySelectorAll(`.planning-item[data-datum="${datum}"]`);
        const adressenList = [];
        
        items.forEach(item => {
            const id = parseInt(item.dataset.id);
            const planning = allePlanningen.find(p => p.id === id);
            if (planning && planning.adres) {
                adressenList.push({
                    id: planning.id,
                    instelling_naam: planning.adres.instelling_naam,
                    straat: planning.adres.straat,
                    postcode: planning.adres.postcode,
                    plaats: planning.adres.plaats
                });
            }
        });
        
        if (adressenList.length === 0) {
            alert('Geen adressen gevonden voor deze dag.');
            return;
        }
        
        if (adressenList.length < 2) {
            alert('Er zijn minimaal 2 adressen nodig voor optimalisatie.');
            return;
        }
        
        // Toon loading state
        const btn = document.querySelector(`.ai-optimize-btn[data-datum="${datum}"]`);
        if (!btn) {
            alert('AI knop niet gevonden.');
            return;
        }
        const origText = btn.textContent;
        btn.textContent = '⏳ Bezig...';
        btn.disabled = true;
        
        try {
            // Bouw de prompt
            let adresLijst = "";
            adressenList.forEach((adres, index) => {
                adresLijst += `${index + 1}. ${adres.instelling_naam}, ${adres.straat}, ${adres.postcode} ${adres.plaats}\n`;
            });
            
            // Haal de API key uit localStorage
            const apiKey = localStorage.getItem('openrouter_key') || '';
            if (!apiKey) {
                throw new Error('Geen OpenRouter API key gevonden. Voeg deze toe via de console: localStorage.setItem("openrouter_key", "jouw-key")');
            }
            
            // Roep OpenRouter API direct aan met Gemma 4 (gratis)
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://therealmookey.github.io',
                    'X-Title': 'Abbott Route Planner',
                },
                body: JSON.stringify({
                    model: 'google/gemma-4-31b-it:free',
                    messages: [
                        {
                            role: 'system',
                            content: 'Je bent een route-optimalisatie expert. Geef een JSON array met de IDs van de adressen in de beste volgorde. Bijvoorbeeld: [2, 1, 3]'
                        },
                        {
                            role: 'user',
                            content: `Optimaliseer deze adressen voor een circulaire route (begin en einde op Schoonmansveld 48, 2870 Puurs):\n${adresLijst}`
                        }
                    ],
                    stream: false,
                    temperature: 0.3,
                })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error?.message || 'Er ging iets mis met de AI');
            }
            
            let nieuweVolgorde = [];
            try {
                const content = result.choices[0].message.content;
                nieuweVolgorde = JSON.parse(content);
            } catch {
                const content = result.choices[0].message.content;
                const matches = content.match(/\d+/g);
                if (matches) nieuweVolgorde = matches.map(Number);
            }
            
            if (!nieuweVolgorde || nieuweVolgorde.length === 0) {
                throw new Error('Geen geldige volgorde ontvangen van AI');
            }
            
            // Sla de nieuwe volgorde op
            for (let i = 0; i < nieuweVolgorde.length; i++) {
                const planningId = nieuweVolgorde[i];
                const volgorde = i + 1;
                
                const { error } = await window.supabase
                    .from('planningen')
                    .update({ dag_volgorde: volgorde })
                    .eq('id', planningId);
                
                if (error) throw error;
            }
            
            alert(`✅ Route geoptimaliseerd! De volgorde is aangepast op basis van AI-advies.`);
            
            // ===== FORCEER EEN VISUELE UPDATE =====
            // Herlaad de planning en zorg dat de verandering zichtbaar wordt
            await laadPlanningen();
            
            // Scroll naar de datum header
            const datumHeader = document.querySelector(`.datum-header[data-datum="${datum}"]`);
            if (datumHeader) {
                datumHeader.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Markeer de datum header even om de verandering te benadrukken
                datumHeader.style.transition = 'background-color 0.5s';
                datumHeader.style.backgroundColor = '#d4edda';
                setTimeout(() => {
                    datumHeader.style.backgroundColor = '';
                }, 2000);
            }
            
        } catch (err) {
            console.error('AI optimalisatie fout:', err);
            alert(`❌ Fout bij AI optimalisatie: ${err.message}`);
        } finally {
            btn.textContent = origText;
            btn.disabled = false;
        }
    }
    
    // Laad alle planningen, gesorteerd op datum
    async function laadPlanningen() {
        if (!planningLijst) return;
        
        planningLijst.innerHTML = '<p>Laden...</p>';
        
        // Eerst chauffeurs laden als die nog niet geladen zijn
        if (chauffeurs.length === 0) {
            await laadChauffeurs();
        }
        
        const { data, error } = await window.supabase
            .from('planningen')
            .select(`
                *,
                adres:adres_id (id, instelling_naam, straat, postcode, plaats, telefoon, extra_info)
            `)
            .order('datum', { ascending: true })
            .order('dag_volgorde', { ascending: true })
            .order('id', { ascending: true });
        
        if (error) {
            planningLijst.innerHTML = `<p class="error">Fout bij laden: ${error.message}</p>`;
            return;
        }
        
        allePlanningen = data || [];
        planningLijst.innerHTML = '';
        
        if (!data || data.length === 0) {
            planningLijst.innerHTML = '<p>Geen planningen gevonden. Klik op "+ Nieuwe planning" om er een toe te voegen.</p>';
            return;
        }
        
        // Groepeer per datum
        const datumGroepen = {};
        for (const planning of data) {
            if (!datumGroepen[planning.datum]) {
                datumGroepen[planning.datum] = [];
            }
            datumGroepen[planning.datum].push(planning);
        }
        
        // Toon planningen met per datum opnieuw beginnende nummering
        for (const datum of Object.keys(datumGroepen).sort()) {
            const datumObj = new Date(datum + 'T00:00:00');
            const dagVanWeek = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'][datumObj.getDay()];
            const items = datumGroepen[datum];
            const opgeslagenChauffeur = getChauffeurForDate(datum);
            
            // Datum header met chauffeur selector en AI knop
            const datumHeader = document.createElement('div');
            datumHeader.className = 'datum-header';
            datumHeader.dataset.datum = datum;
            datumHeader.innerHTML = `
                <div class="datum-header-content">
                    <span class="datum-dag">${dagVanWeek}</span>
                    <span class="datum-datum">${datumObj.getDate()} ${datumObj.toLocaleString('nl-NL', { month: 'long' })} ${datumObj.getFullYear()}</span>
                    <span class="datum-count">${items.length} ritten</span>
                </div>
                <div class="datum-actions">
                    <div class="chauffeur-selector-wrapper">
                        <label>👨‍✈️ Chauffeur:</label>
                        ${generateChauffeurDropdown(opgeslagenChauffeur)}
                    </div>
                    <button class="btn btn-success markeer-dag-btn" data-datum="${datum}">✅ Uitgevoerd</button>
                    <button class="btn btn-primary whatsapp-dag-btn" data-datum="${datum}">📱 WhatsApp</button>
                    <button class="btn btn-primary ai-optimize-btn" data-datum="${datum}">🤖 AI Optimaliseer</button>
                </div>
            `;
            planningLijst.appendChild(datumHeader);
            
            // Event listener voor chauffeur selectie
            const chauffeurSelect = datumHeader.querySelector('.chauffeur-select');
            if (chauffeurSelect) {
                chauffeurSelect.dataset.datum = datum;
                chauffeurSelect.addEventListener('change', (e) => {
                    saveChauffeurForDate(datum, e.target.value);
                });
            }
            
            // Event listeners voor dag acties
            datumHeader.querySelector('.markeer-dag-btn').addEventListener('click', () => markeerDagUitgevoerd(datum));
            datumHeader.querySelector('.whatsapp-dag-btn').addEventListener('click', () => genereerWhatsAppVoorDatum(datum));
            datumHeader.querySelector('.ai-optimize-btn').addEventListener('click', () => optimaliseerMetAI(datum));
            
            // Planning items voor deze datum
            for (let i = 0; i < items.length; i++) {
                const planning = items[i];
                const item = document.createElement('div');
                item.className = 'planning-item sortable-item';
                item.dataset.id = planning.id;
                item.dataset.datum = planning.datum;
                item.dataset.volgorde = planning.dag_volgorde || (i + 1);
                
                let statusClass = planning.status === 'gepland' ? 'status-gepland' : 
                                 (planning.status === 'uitgevoerd' ? 'status-uitgevoerd' : 'status-geannuleerd');
                
                let extraInfo = '';
                if (planning.type === 'ophaling' && planning.aantal_tonnen) {
                    extraInfo = `<p>📦 <strong>Aantal volle tonnen:</strong> ${planning.aantal_tonnen} stuks</p>`;
                } else if (planning.type === 'plaatsing' && planning.aantal_lege_tonnen) {
                    extraInfo = `<p>🚚 <strong>Aantal lege tonnen meenemen:</strong> ${planning.aantal_lege_tonnen} stuks</p>`;
                }
                
                let extraInfoText = '';
                if (planning.adres?.extra_info) {
                    extraInfoText = `<p class="adres-extra-info">📝 ${escapeHtml(planning.adres.extra_info)}</p>`;
                }
                
                let telefoonText = '';
                if (planning.adres?.telefoon) {
                    telefoonText = `<p>📞 ${escapeHtml(planning.adres.telefoon)}</p>`;
                }
                
                const volgnummer = (planning.dag_volgorde || (i + 1));
                
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
        
        // Initialiseer SortableJS
        initSortable();
    }
    
    // Initialiseer SortableJS
    function initSortable() {
        const list = document.getElementById('planningLijst');
        if (!list) return;
        
        if (sortableInstance) {
            sortableInstance.destroy();
        }
        
        sortableInstance = new Sortable(list, {
            handle: '.drag-handle',
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            filter: '.datum-header',
            preventOnFilter: false,
            onEnd: function(evt) {
                updateStopNumbers();
                const datum = evt.item.dataset.datum;
                if (datum) {
                    saveRouteOrderForDate(datum);
                }
            }
        });
    }
    
    // Update de stop nummers
    function updateStopNumbers() {
        const items = document.querySelectorAll('.planning-item');
        let currentDatum = '';
        let teller = 0;
        
        items.forEach(item => {
            const datum = item.dataset.datum;
            if (datum !== currentDatum) {
                currentDatum = datum;
                teller = 1;
            } else {
                teller++;
            }
            const badge = item.querySelector('.stop-number-badge');
            if (badge) {
                badge.textContent = `#${teller}`;
            }
            item.dataset.volgorde = teller;
        });
    }
    
    // Sla de route volgorde op voor een specifieke datum
    async function saveRouteOrderForDate(datum) {
        const items = document.querySelectorAll(`.planning-item[data-datum="${datum}"]`);
        const updates = [];
        
        items.forEach((item, index) => {
            const id = parseInt(item.dataset.id);
            const volgorde = index + 1;
            updates.push({ id, volgorde });
        });
        
        if (updates.length === 0) return;
        
        try {
            for (const update of updates) {
                const { error } = await window.supabase
                    .from('planningen')
                    .update({ dag_volgorde: update.volgorde })
                    .eq('id', update.id);
                
                if (error) throw error;
            }
            console.log(`Volgorde voor ${datum} opgeslagen`);
        } catch (err) {
            console.error('Fout bij opslaan volgorde:', err);
        }
    }
    
    // Markeer alle ritten van een dag als uitgevoerd
    async function markeerDagUitgevoerd(datum) {
        const items = document.querySelectorAll(`.planning-item[data-datum="${datum}"]`);
        if (items.length === 0) return;
        
        if (!confirm(`Weet je zeker dat je alle ${items.length} ritten van ${datum} wilt markeren als uitgevoerd?`)) return;
        
        try {
            for (const item of items) {
                const id = parseInt(item.dataset.id);
                const { error } = await window.supabase
                    .from('planningen')
                    .update({ status: 'uitgevoerd' })
                    .eq('id', id);
                
                if (error) throw error;
            }
            
            alert(`Alle ritten van ${datum} gemarkeerd als uitgevoerd!`);
            laadPlanningen();
            
        } catch (err) {
            alert('Fout: ' + err.message);
        }
    }
    
    // Genereer WhatsApp bericht voor een specifieke datum
    function genereerWhatsAppVoorDatum(datum) {
        const items = document.querySelectorAll(`.planning-item[data-datum="${datum}"]`);
        if (items.length === 0) {
            alert('Geen ritten voor deze datum.');
            return;
        }
        
        // Haal de geselecteerde chauffeur voor deze datum
        const chauffeurSelect = document.querySelector(`.datum-header[data-datum="${datum}"] .chauffeur-select`);
        const chauffeurTel = chauffeurSelect ? chauffeurSelect.value : '';
        
        if (!chauffeurTel) {
            alert('Selecteer eerst een chauffeur voor deze dag via de dropdown bij de datum header.');
            return;
        }
        
        // Verzamel de planning data voor deze datum
        const planningData = [];
        items.forEach(item => {
            const id = parseInt(item.dataset.id);
            const planning = allePlanningen.find(p => p.id === id);
            if (planning) {
                planningData.push(planning);
            }
        });
        
        // Genereer WhatsApp bericht
        const datumObj = new Date(datum + 'T00:00:00');
        const datumStr = datumObj.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        let bericht = `🚚 *ABBOTT ROUTE PLANNING* 🚚\n\n`;
        bericht += `📅 *Datum:* ${datumStr}\n`;
        bericht += `📍 *START & EINDE:* Schoonmansveld 48, 2870 Puurs\n\n`;
        bericht += `*📋 CIRCULAIRE ROUTE (${planningData.length} stops)*\n`;
        bericht += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        planningData.forEach((planning, index) => {
            bericht += `${index + 1}. *${planning.adres?.instelling_naam || 'Onbekend'}*\n`;
            bericht += `   📍 ${planning.adres?.straat || ''}\n`;
            bericht += `   📮 ${planning.adres?.postcode || ''} ${planning.adres?.plaats || ''}\n`;
            if (planning.type === 'ophaling') {
                bericht += `   📦 OPHALING: ${planning.aantal_tonnen || 1} volle ton(nen)\n`;
            } else if (planning.type === 'plaatsing') {
                bericht += `   🚚 PLAATSING: ${planning.aantal_lege_tonnen || 1} lege ton(nen)\n`;
            }
            if (planning.adres?.telefoon) {
                bericht += `   📞 Contact: ${planning.adres.telefoon}\n`;
            }
            if (planning.adres?.extra_info) {
                bericht += `   📝 *EXTRA INFO:* ${planning.adres.extra_info}\n`;
            }
            if (planning.opmerkingen) {
                bericht += `   📋 *OPMERKINGEN:* ${planning.opmerkingen}\n`;
            }
            bericht += `\n`;
        });
        
        bericht += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        bericht += `${planningData.length + 1}. *TERUGKEER NAAR BASIS*\n`;
        bericht += `   📍 Schoonmansveld 48, 2870 Puurs\n`;
        bericht += `   🏁 EINDE RIT\n\n`;
        
        bericht += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        bericht += `🗺️ Open in Waze:\n`;
        bericht += `https://www.waze.com/ul?ll=51.0589,4.2863&navigate=yes&q=`;
        
        const adressenVoorRoute = planningData.map(p => 
            encodeURIComponent(`${p.adres?.straat || ''}, ${p.adres?.postcode || ''} ${p.adres?.plaats || ''}`)
        );
        bericht += adressenVoorRoute.join('&q=');
        bericht += `&q=${encodeURIComponent('Schoonmansveld 48, 2870 Puurs')}`;
        
        huidigeWhatsAppDatum = datum;
        
        if (whatsappBericht) whatsappBericht.value = bericht;
        whatsappPopup.style.display = 'flex';
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
            document.getElementById('planningDatum').value = new Date().toISOString().split('T')[0];
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
                dag_volgorde: 0
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
            else { 
                planningPopup.style.display = 'none';
                laadPlanningen();
            }
        });
    }
    
    if (closePlanningPopup) closePlanningPopup.addEventListener('click', () => planningPopup.style.display = 'none');
    
    // WhatsApp versturen
    if (sendWhatsAppBtn) {
        sendWhatsAppBtn.addEventListener('click', () => {
            const chauffeurSelect = document.querySelector(`.datum-header[data-datum="${huidigeWhatsAppDatum}"] .chauffeur-select`);
            const telefoon = chauffeurSelect ? chauffeurSelect.value : '';
            const bericht = whatsappBericht?.value;
            
            if (!telefoon) {
                alert('Selecteer eerst een chauffeur voor deze dag in de datum header.');
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
    
});