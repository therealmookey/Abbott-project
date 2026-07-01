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
    const registratieType = document.getElementById('registratieType');
    const ziekenhuisSelect = document.getElementById('ziekenhuisSelect');
    const ophalingVeldenReg = document.getElementById('ophalingVeldenReg');
    const opstartVelden = document.getElementById('opstartVelden');
    const combinatieSelect = document.getElementById('combinatieSelect');
    const opstartAantal = document.getElementById('opstartAantal');
    const searchZiekenhuis = document.getElementById('searchZiekenhuis');
    const filterDatumVanaf = document.getElementById('filterDatumVanaf');
    const filterDatumTot = document.getElementById('filterDatumTot');
    const typeFilter = document.getElementById('typeFilter');
    const filterBtn = document.getElementById('filterBtn');
    const resetFilterBtn = document.getElementById('resetFilterBtn');
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    
    let currentRegistratieId = null;
    let adressen = [];
    let combinaties = [];
    let alleRegistraties = [];
    
    // ===== LAAD DATA =====
    
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
    
    // Laad combinaties voor opstart dropdown
    async function laadCombinaties() {
        try {
            // Haal alle combinatie items op
            const { data: comps, error: compError } = await window.supabase
                .from('combinatie_componenten')
                .select('combinatie_id');
            
            if (compError) throw compError;
            
            const combinatieIds = comps.map(c => c.combinatie_id);
            
            // Haal de combinatie items op
            const { data, error } = await window.supabase
                .from('stock_items')
                .select('id, item_code, omschrijving, aantal')
                .in('id', combinatieIds)
                .order('item_code');
            
            if (error) throw error;
            
            combinaties = data || [];
            return combinaties;
        } catch (err) {
            console.error('Fout bij laden combinaties:', err);
            return [];
        }
    }
    
    function vulCombinatieDropdown() {
        if (!combinatieSelect) return;
        combinatieSelect.innerHTML = '<option value="">Kies een combinatie...</option>';
        combinaties.forEach(combo => {
            const option = document.createElement('option');
            option.value = combo.id;
            option.textContent = `${combo.item_code} - ${combo.omschrijving} (${combo.aantal} beschikbaar)`;
            combinatieSelect.appendChild(option);
        });
    }
    
    // Toon/verberg velden op basis van type
    if (registratieType) {
        registratieType.addEventListener('change', (e) => {
            const type = e.target.value;
            if (type === 'opstart') {
                ophalingVeldenReg.style.display = 'none';
                opstartVelden.style.display = 'block';
                document.getElementById('gewicht').required = false;
            } else {
                ophalingVeldenReg.style.display = 'block';
                opstartVelden.style.display = 'none';
                document.getElementById('gewicht').required = true;
            }
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
                ziekenhuis:ziekenhuis_id (id, instelling_naam, straat, postcode, plaats),
                combinatie:combinatie_id (id, item_code, omschrijving)
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
        
        // Filter op type
        if (typeFilter?.value && typeFilter.value !== 'alles') {
            query = query.eq('type', typeFilter.value);
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
            registratiesLijst.innerHTML = '<p>Geen registraties gevonden. Klik op "+ Nieuwe registratie" om er een toe te voegen.</p>';
            return;
        }
        
        // Tabel weergave
        let html = `
            <div style="overflow-x: auto;">
            <table style="width:100%; border-collapse: collapse;" id="registratiesTabel">
                <thead>
                    <tr style="background-color: #2c7da0; color: white;">
                        <th style="padding: 10px; text-align: left;">#</th>
                        <th style="padding: 10px; text-align: left;">Type</th>
                        <th style="padding: 10px; text-align: left;">Ziekenhuis</th>
                        <th style="padding: 10px; text-align: left;">Datum</th>
                        <th style="padding: 10px; text-align: right;">Gewicht / Aantal</th>
                        <th style="padding: 10px; text-align: left;">Opmerkingen</th>
                        <th style="padding: 10px; text-align: center;">Acties</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        let teller = 1;
        let totaalGewicht = 0;
        for (const r of filteredData) {
            const datum = new Date(r.registratiedatum + 'T00:00:00');
            const datumStr = datum.toLocaleDateString('nl-NL');
            
            let typeLabel = r.type === 'opstart' ? '🔄 Opstart' : '📦 Ophaling';
            let waardeLabel = '';
            if (r.type === 'opstart') {
                waardeLabel = `${r.opstart_aantal || 1}x ${r.combinatie?.item_code || ''}`;
            } else {
                waardeLabel = `${r.gewicht} kg`;
                totaalGewicht += r.gewicht || 0;
            }
            
            html += `
                <tr style="border-bottom: 1px solid #e9ecef;">
                    <td style="padding: 10px;">${teller}</td>
                    <td style="padding: 10px;">${typeLabel}</td>
                    <td style="padding: 10px;"><strong>${escapeHtml(r.ziekenhuis?.instelling_naam || 'Onbekend')}</strong></td>
                    <td style="padding: 10px;">${datumStr}</td>
                    <td style="padding: 10px; text-align: right;">${waardeLabel}</td>
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
            <div style="margin-top: 10px; color: #6c757d; font-size: 0.9rem; display: flex; flex-wrap: wrap; gap: 20px;">
                <span><strong>Totaal registraties:</strong> ${filteredData.length}</span>
                ${typeFilter?.value === 'opstart' || typeFilter?.value === 'alles' ? `<span><strong>Totaal opstarten:</strong> ${filteredData.filter(r => r.type === 'opstart').length}</span>` : ''}
                ${typeFilter?.value === 'ophaling' || typeFilter?.value === 'alles' ? `<span><strong>Totaal gewicht:</strong> ${totaalGewicht.toFixed(1)} kg</span>` : ''}
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
    
    // ===== EXPORT FUNCTIES =====
    
    function getExportData() {
        const data = [];
        const rows = document.querySelectorAll('#registratiesTabel tbody tr');
        rows.forEach(row => {
            const cols = row.querySelectorAll('td');
            if (cols.length >= 6) {
                data.push({
                    nummer: cols[0].textContent.trim(),
                    type: cols[1].textContent.trim(),
                    ziekenhuis: cols[2].textContent.trim(),
                    datum: cols[3].textContent.trim(),
                    gewicht_aantal: cols[4].textContent.trim(),
                    opmerkingen: cols[5].textContent.trim()
                });
            }
        });
        return data;
    }
    
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', () => {
            const data = getExportData();
            if (data.length === 0) {
                alert('Geen data om te exporteren.');
                return;
            }
            
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, 'Registraties');
            
            ws['!cols'] = [
                { wch: 6 },   // #
                { wch: 15 },  // Type
                { wch: 30 },  // Ziekenhuis
                { wch: 15 },  // Datum
                { wch: 15 },  // Gewicht/Aantal
                { wch: 30 }   // Opmerkingen
            ];
            
            const fileName = `Registraties_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
        });
    }
    
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', () => {
            const data = getExportData();
            if (data.length === 0) {
                alert('Geen data om te exporteren.');
                return;
            }
            
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            if (!printWindow) {
                alert('Popup geblokkeerd! Sta popups toe voor deze site.');
                return;
            }
            
            const datum = new Date().toLocaleDateString('nl-NL');
            
            let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Registraties</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; background: white; }
                    .header { text-align: center; border-bottom: 3px solid #2c7da0; padding-bottom: 15px; margin-bottom: 20px; }
                    .header h1 { color: #2c7da0; font-size: 24px; }
                    .header p { color: #6c757d; font-size: 14px; margin-top: 5px; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    th { background-color: #2c7da0; color: white; padding: 8px 10px; text-align: left; }
                    td { padding: 6px 10px; border-bottom: 1px solid #e9ecef; }
                    tr:nth-child(even) { background-color: #f8f9fa; }
                    .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e9ecef; text-align: center; font-size: 11px; color: #6c757d; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📋 Registraties</h1>
                    <p>Gegenereerd op ${datum}</p>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Type</th>
                            <th>Ziekenhuis</th>
                            <th>Datum</th>
                            <th>Gewicht / Aantal</th>
                            <th>Opmerkingen</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            data.forEach((r, index) => {
                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${escapeHtml(r.type)}</td>
                        <td>${escapeHtml(r.ziekenhuis)}</td>
                        <td>${r.datum}</td>
                        <td style="text-align: right;">${escapeHtml(r.gewicht_aantal)}</td>
                        <td>${escapeHtml(r.opmerkingen || '-')}</td>
                    </tr>
                `;
            });
            
            html += `
                    </tbody>
                </table>
                
                <div class="footer">
                    Abbott Platform - Registraties overzicht
                </div>
            </body>
            </html>
            `;
            
            printWindow.document.write(html);
            printWindow.document.close();
            
            printWindow.onload = function() {
                setTimeout(function() {
                    printWindow.focus();
                    printWindow.print();
                }, 500);
            };
        });
    }
    
    // ===== CRUD FUNCTIES =====
    
    // Nieuwe registratie
    if (addRegistratieBtn) {
        addRegistratieBtn.addEventListener('click', async () => {
            currentRegistratieId = null;
            popupTitle.textContent = 'Nieuwe registratie';
            document.getElementById('registratieDatum').value = new Date().toISOString().split('T')[0];
            document.getElementById('gewicht').value = '';
            document.getElementById('opmerkingen').value = '';
            document.getElementById('opstartAantal').value = '1';
            
            await laadAdressen();
            vulAdresDropdown();
            await laadCombinaties();
            vulCombinatieDropdown();
            
            registratieType.value = 'ophaling';
            ophalingVeldenReg.style.display = 'block';
            opstartVelden.style.display = 'none';
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
            await laadCombinaties();
            vulCombinatieDropdown();
            
            ziekenhuisSelect.value = data.ziekenhuis_id;
            document.getElementById('registratieDatum').value = data.registratiedatum;
            document.getElementById('opmerkingen').value = data.opmerkingen || '';
            
            registratieType.value = data.type || 'ophaling';
            
            if (data.type === 'opstart') {
                ophalingVeldenReg.style.display = 'none';
                opstartVelden.style.display = 'block';
                combinatieSelect.value = data.combinatie_id || '';
                document.getElementById('opstartAantal').value = data.opstart_aantal || 1;
            } else {
                ophalingVeldenReg.style.display = 'block';
                opstartVelden.style.display = 'none';
                document.getElementById('gewicht').value = data.gewicht || '';
            }
            
            registratiePopup.style.display = 'flex';
            
        } catch (err) {
            alert('Fout bij laden: ' + err.message);
        }
    }
    
    // Verwijder registratie
    async function verwijderRegistratie(id) {
        if (!confirm('Weet je zeker dat je deze registratie wilt verwijderen?')) return;
        
        try {
            // Check of het een opstart was, dan moeten we de voorraad herstellen
            const { data } = await window.supabase
                .from('ophaalregistraties')
                .select('type, combinatie_id, opstart_aantal')
                .eq('id', id)
                .single();
            
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
            const type = registratieType?.value;
            const ziekenhuisId = ziekenhuisSelect?.value;
            const datum = document.getElementById('registratieDatum')?.value;
            const opmerkingen = document.getElementById('opmerkingen')?.value;
            
            if (!ziekenhuisId || !datum || !type) {
                alert('Vul alle verplichte velden in');
                return;
            }
            
            let registratieData = {
                ziekenhuis_id: parseInt(ziekenhuisId),
                registratiedatum: datum,
                type: type,
                opmerkingen: opmerkingen || null
            };
            
            if (type === 'ophaling') {
                const gewicht = document.getElementById('gewicht')?.value;
                if (!gewicht) {
                    alert('Gewicht is verplicht voor ophaling');
                    return;
                }
                registratieData.gewicht = parseFloat(gewicht);
                registratieData.combinatie_id = null;
                registratieData.opstart_aantal = null;
            } else if (type === 'opstart') {
                const combinatieId = combinatieSelect?.value;
                const aantal = parseInt(document.getElementById('opstartAantal')?.value) || 1;
                
                if (!combinatieId) {
                    alert('Selecteer een combinatie');
                    return;
                }
                
                // Controleer of de combinatie voldoende voorraad heeft
                const { data: comboCheck } = await window.supabase
                    .from('stock_items')
                    .select('aantal')
                    .eq('id', combinatieId)
                    .single();
                
                if (!comboCheck || comboCheck.aantal < aantal) {
                    alert(`Niet genoeg voorraad! Huidig: ${comboCheck?.aantal || 0}, Nodig: ${aantal}`);
                    return;
                }
                
                registratieData.combinatie_id = parseInt(combinatieId);
                registratieData.opstart_aantal = aantal;
                registratieData.gewicht = null;
            }
            
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
                    
                    // Als het een nieuwe opstart is, haal de componenten uit de voorraad
                    if (!error && type === 'opstart' && registratieData.combinatie_id) {
                        await verwerkOpstartVoorraad(registratieData.combinatie_id, registratieData.opstart_aantal);
                    }
                }
                
                if (error) throw error;
                
                registratiePopup.style.display = 'none';
                laadRegistraties();
                laadCombinaties(); // Refresh combinatie dropdown
                
            } catch (err) {
                alert('Fout bij opslaan: ' + err.message);
            }
        });
    }
    
    // ===== OPSTART VOORRAAD FUNCTIE =====
    async function verwerkOpstartVoorraad(combinatieId, aantal) {
        try {
            // Haal alle componenten van deze combinatie op
            const { data: comps, error: compError } = await window.supabase
                .from('combinatie_componenten')
                .select('*')
                .eq('combinatie_id', combinatieId);
            
            if (compError) throw compError;
            
            if (comps.length === 0) {
                console.warn('Geen componenten gevonden voor combinatie:', combinatieId);
                return;
            }
            
            for (const comp of comps) {
                const { data: compItem } = await window.supabase
                    .from('stock_items')
                    .select('aantal, omschrijving')
                    .eq('id', comp.component_id)
                    .single();
                
                if (compItem) {
                    const nieuwAantal = compItem.aantal - (comp.aantal * aantal);
                    await window.supabase
                        .from('stock_items')
                        .update({ aantal: Math.max(0, nieuwAantal) })
                        .eq('id', comp.component_id);
                    
                    // Log waarschuwing als voorraad negatief zou worden
                    if (nieuwAantal < 0) {
                        console.warn(`Waarschuwing: ${compItem.omschrijving} heeft onvoldoende voorraad!`);
                    }
                }
            }
            
            console.log(`Opstart voorraad verwerkt: ${aantal}x combinatie ${combinatieId}`);
            
        } catch (err) {
            console.error('Fout bij verwerken opstart voorraad:', err);
        }
    }
    
    // ===== FILTERS =====
    if (filterBtn) {
        filterBtn.addEventListener('click', laadRegistraties);
    }
    
    if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', () => {
            searchZiekenhuis.value = '';
            filterDatumVanaf.value = '';
            filterDatumTot.value = '';
            typeFilter.value = 'alles';
            laadRegistraties();
        });
    }
    
    if (searchZiekenhuis) {
        searchZiekenhuis.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                laadRegistraties();
            }
        });
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === registratiePopup) registratiePopup.style.display = 'none';
    });
    
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Initialiseer
    laadRegistraties();
    laadCombinaties();
    
});
// ===== SCROLL FUNCTIE =====

const scrollBtn = document.getElementById('scrollBtn');

function updateScrollButton() {
    if (!scrollBtn) return;
    
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const maxScroll = documentHeight - windowHeight;
    
    // Check of we bovenaan, onderaan of in het midden zijn
    const isAtTop = scrollY < 100;
    const isAtBottom = scrollY >= maxScroll - 100;
    
    if (isAtTop) {
        // Bovenaan: alleen naar beneden
        scrollBtn.innerHTML = '<span class="scroll-icon">▼</span>';
        scrollBtn.title = 'Scroll naar beneden';
        scrollBtn.className = 'scroll-btn scroll-down';
    } else if (isAtBottom) {
        // Onderaan: alleen naar boven
        scrollBtn.innerHTML = '<span class="scroll-icon">▲</span>';
        scrollBtn.title = 'Scroll naar boven';
        scrollBtn.className = 'scroll-btn scroll-up';
    } else {
        // Midden: beide knoppen (twee pijlen)
        scrollBtn.innerHTML = '<span class="scroll-icon">▲▼</span>';
        scrollBtn.title = 'Scroll naar boven of beneden';
        scrollBtn.className = 'scroll-btn scroll-both';
    }
}

if (scrollBtn) {
    scrollBtn.addEventListener('click', function() {
        const scrollY = window.scrollY;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const maxScroll = documentHeight - windowHeight;
        
        const isAtTop = scrollY < 100;
        const isAtBottom = scrollY >= maxScroll - 100;
        
        if (isAtTop) {
            // Scroll naar beneden
            window.scrollTo({
                top: documentHeight,
                behavior: 'smooth'
            });
        } else if (isAtBottom) {
            // Scroll naar boven
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        } else {
            // In het midden: scroll naar de dichtstbijzijnde kant
            if (scrollY < maxScroll / 2) {
                // Eerste helft: scroll naar beneden
                window.scrollTo({
                    top: documentHeight,
                    behavior: 'smooth'
                });
            } else {
                // Tweede helft: scroll naar boven
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
        }
    });
    
    // Update scroll button bij scroll events
    let scrollTimeout;
    window.addEventListener('scroll', function() {
        if (scrollTimeout) {
            window.cancelAnimationFrame(scrollTimeout);
        }
        scrollTimeout = window.requestAnimationFrame(function() {
            updateScrollButton();
        });
    });
    
    // Update ook bij resize
    window.addEventListener('resize', updateScrollButton);
    
    // Initialiseer de knop
    setTimeout(updateScrollButton, 500);
}