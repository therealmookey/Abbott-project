// ===== OPHAALREGISTRATIES FUNCTIES =====

console.log('registraties.js geladen');

document.addEventListener('DOMContentLoaded', function() {
    
    if (!window.supabase) {
        console.error('Supabase niet beschikbaar!');
        return;
    }
    
    // DOM elementen
    const registratiesLijst = document.getElementById('registratiesLijst');
    const addRegistratieBtn = document.getElementById('addRegistratieBtn');
    const registratiePopup = document.getElementById('registratiePopup');
    const saveRegistratieBtn = document.getElementById('saveRegistratieBtn');
    const closeRegistratiePopup = document.getElementById('closeRegistratiePopup');
    const popupTitle = document.getElementById('popupTitle');
    const ziekenhuisSelect = document.getElementById('ziekenhuisSelect');
    const searchZiekenhuis = document.getElementById('searchZiekenhuis');
    const filterDatumVanaf = document.getElementById('filterDatumVanaf');
    const filterDatumTot = document.getElementById('filterDatumTot');
    const filterBtn = document.getElementById('filterBtn');
    const resetFilterBtn = document.getElementById('resetFilterBtn');
    
    let currentRegistratieId = null;
    let adressen = [];
    let alleRegistraties = [];
    
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
        if (!ziekenhuisSelect) return;
        ziekenhuisSelect.innerHTML = '<option value="">Kies een ziekenhuis...</option>';
        adressen.forEach(adres => {
            const option = document.createElement('option');
            option.value = adres.id;
            option.textContent = `${adres.instelling_naam} - ${adres.straat}, ${adres.plaats}`;
            ziekenhuisSelect.appendChild(option);
        });
    }
    
    // Laad registraties met filters
    async function laadRegistraties() {
        if (!registratiesLijst) return;
        
        registratiesLijst.innerHTML = '<p>Bezig met laden...</p>';
        
        let query = window.supabase
            .from('ophaalregistraties')
            .select(`
                *,
                ziekenhuis:ziekenhuis_id (id, instelling_naam, straat, postcode, plaats)
            `)
            .order('registratiedatum', { ascending: false })
            .order('created_at', { ascending: false });
        
        // Filter op datum
        if (filterDatumVanaf?.value) {
            query = query.gte('registratiedatum', filterDatumVanaf.value);
        }
        if (filterDatumTot?.value) {
            query = query.lte('registratiedatum', filterDatumTot.value);
        }
        
        const { data, error } = await query;
        
        if (error) {
            registratiesLijst.innerHTML = `<p class="error">Fout bij laden: ${error.message}</p>`;
            return;
        }
        
        // Filter op ziekenhuisnaam (client-side)
        const zoekterm = searchZiekenhuis?.value?.trim();
        let filteredData = data || [];
        if (zoekterm) {
            const term = zoekterm.toLowerCase();
            filteredData = filteredData.filter(r => 
                r.ziekenhuis?.instelling_naam?.toLowerCase().includes(term)
            );
        }
        
        alleRegistraties = filteredData;
        
        if (filteredData.length === 0) {
            registratiesLijst.innerHTML = '<p>Geen ophaalregistraties gevonden. Klik op "+ Nieuwe registratie" om er een toe te voegen.</p>';
            return;
        }
        
        // Tabel weergave (Excel-achtige lijst)
        let html = `
            <div style="overflow-x: auto;">
            <table style="width:100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #2c7da0; color: white;">
                        <th style="padding: 10px; text-align: left;">#</th>
                        <th style="padding: 10px; text-align: left;">Ziekenhuis</th>
                        <th style="padding: 10px; text-align: left;">Datum</th>
                        <th style="padding: 10px; text-align: right;">Gewicht (kg)</th>
                        <th style="padding: 10px; text-align: left;">Opmerkingen</th>
                        <th style="padding: 10px; text-align: center;">Acties</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        let teller = 1;
        for (const r of filteredData) {
            const datum = new Date(r.registratiedatum + 'T00:00:00');
            const datumStr = datum.toLocaleDateString('nl-NL');
            
            html += `
                <tr style="border-bottom: 1px solid #e9ecef;">
                    <td style="padding: 10px;">${teller}</td>
                    <td style="padding: 10px;"><strong>${escapeHtml(r.ziekenhuis?.instelling_naam || 'Onbekend')}</strong></td>
                    <td style="padding: 10px;">${datumStr}</td>
                    <td style="padding: 10px; text-align: right;">${r.gewicht}</td>
                    <td style="padding: 10px;">${escapeHtml(r.opmerkingen || '-')}</td>
                    <td style="padding: 10px; text-align: center;">
                        <button class="btn btn-secondary edit-btn" data-id="${r.id}" style="margin-right: 5px;">✏️</button>
                        <button class="btn btn-danger delete-btn" data-id="${r.id}">🗑️</button>
                    </td>
                </tr>
            `;
            teller++;
        }
        
        html += `
                </tbody>
            </table>
            </div>
            <div style="margin-top: 10px; color: #6c757d; font-size: 0.9rem;">
                <strong>Totaal:</strong> ${filteredData.length} registraties | 
                <strong>Totaal gewicht:</strong> ${filteredData.reduce((sum, r) => sum + (r.gewicht || 0), 0).toFixed(1)} kg
            </div>
        `;
        
        registratiesLijst.innerHTML = html;
        
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => bewerkRegistratie(btn.dataset.id));
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => verwijderRegistratie(btn.dataset.id));
        });
    }
    
    // Nieuwe registratie
    if (addRegistratieBtn) {
        addRegistratieBtn.addEventListener('click', async () => {
            currentRegistratieId = null;
            popupTitle.textContent = 'Nieuwe ophaalregistratie';
            document.getElementById('registratieDatum').value = new Date().toISOString().split('T')[0];
            document.getElementById('gewicht').value = '';
            document.getElementById('opmerkingen').value = '';
            await laadAdressen();
            vulAdresDropdown();
            ziekenhuisSelect.value = '';
            registratiePopup.style.display = 'flex';
        });
    }
    
    // Bewerk registratie
    async function bewerkRegistratie(id) {
        try {
            const { data, error } = await window.supabase
                .from('ophaalregistraties')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            
            currentRegistratieId = id;
            popupTitle.textContent = 'Registratie bewerken';
            
            await laadAdressen();
            vulAdresDropdown();
            ziekenhuisSelect.value = data.ziekenhuis_id;
            
            document.getElementById('registratieDatum').value = data.registratiedatum;
            document.getElementById('gewicht').value = data.gewicht;
            document.getElementById('opmerkingen').value = data.opmerkingen || '';
            
            registratiePopup.style.display = 'flex';
            
        } catch (err) {
            alert('Fout bij laden: ' + err.message);
        }
    }
    
    // Verwijder registratie
    async function verwijderRegistratie(id) {
        if (!confirm('Weet je zeker dat je deze registratie wilt verwijderen?')) return;
        
        try {
            const { error } = await window.supabase
                .from('ophaalregistraties')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            alert('Registratie verwijderd');
            laadRegistraties();
            
        } catch (err) {
            alert('Fout bij verwijderen: ' + err.message);
        }
    }
    
    // Opslaan registratie
    if (saveRegistratieBtn) {
        saveRegistratieBtn.addEventListener('click', async () => {
            const ziekenhuisId = ziekenhuisSelect?.value;
            const datum = document.getElementById('registratieDatum')?.value;
            const gewicht = document.getElementById('gewicht')?.value;
            const opmerkingen = document.getElementById('opmerkingen')?.value;
            
            if (!ziekenhuisId || !datum || !gewicht) {
                alert('Vul alle verplichte velden in (ziekenhuis, datum, gewicht)');
                return;
            }
            
            const registratieData = {
                ziekenhuis_id: parseInt(ziekenhuisId),
                registratiedatum: datum,
                gewicht: parseFloat(gewicht),
                opmerkingen: opmerkingen || null
            };
            
            try {
                let error;
                if (currentRegistratieId) {
                    const result = await window.supabase
                        .from('ophaalregistraties')
                        .update(registratieData)
                        .eq('id', currentRegistratieId);
                    error = result.error;
                } else {
                    const result = await window.supabase
                        .from('ophaalregistraties')
                        .insert([registratieData]);
                    error = result.error;
                }
                
                if (error) {
                    alert('Fout bij opslaan: ' + error.message);
                } else {
                    registratiePopup.style.display = 'none';
                    laadRegistraties();
                }
            } catch (err) {
                alert('Fout: ' + err.message);
            }
        });
    }
    
    if (closeRegistratiePopup) {
        closeRegistratiePopup.addEventListener('click', () => {
            registratiePopup.style.display = 'none';
        });
    }
    
    // Filters
    if (filterBtn) {
        filterBtn.addEventListener('click', laadRegistraties);
    }
    
    if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', () => {
            searchZiekenhuis.value = '';
            filterDatumVanaf.value = '';
            filterDatumTot.value = '';
            laadRegistraties();
        });
    }
    
    // Enter toets voor zoeken
    if (searchZiekenhuis) {
        searchZiekenhuis.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                laadRegistraties();
            }
        });
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === registratiePopup) {
            registratiePopup.style.display = 'none';
        }
    });
    
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Initialiseer
    laadRegistraties();
    
});