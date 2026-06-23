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
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    
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
        
        // Tabel weergave
        let html = `
            <div style="overflow-x: auto;">
            <table style="width:100%; border-collapse: collapse;" id="registratiesTabel">
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
        let totaalGewicht = 0;
        for (const r of filteredData) {
            const datum = new Date(r.registratiedatum + 'T00:00:00');
            const datumStr = datum.toLocaleDateString('nl-NL');
            totaalGewicht += r.gewicht || 0;
            
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
            <div style="margin-top: 10px; color: #6c757d; font-size: 0.9rem; display: flex; flex-wrap: wrap; gap: 20px;">
                <span><strong>Totaal registraties:</strong> ${filteredData.length}</span>
                <span><strong>Totaal gewicht:</strong> ${totaalGewicht.toFixed(1)} kg</span>
                <span><strong>Ziekenhuizen:</strong> ${new Set(filteredData.map(r => r.ziekenhuis?.id)).size}</span>
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
            if (cols.length >= 5) {
                data.push({
                    nummer: cols[0].textContent.trim(),
                    ziekenhuis: cols[1].textContent.trim(),
                    datum: cols[2].textContent.trim(),
                    gewicht: parseFloat(cols[3].textContent.trim()) || 0,
                    opmerkingen: cols[4].textContent.trim()
                });
            }
        });
        return data;
    }
    
    // Export naar Excel
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
            
            // Kolombreedtes instellen
            ws['!cols'] = [
                { wch: 6 },   // #
                { wch: 30 },  // Ziekenhuis
                { wch: 15 },  // Datum
                { wch: 15 },  // Gewicht
                { wch: 30 }   // Opmerkingen
            ];
            
            const fileName = `Ophaalregistraties_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
        });
    }
    
    // Export naar PDF
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
            
            let totaalGewicht = data.reduce((sum, r) => sum + r.gewicht, 0);
            const datum = new Date().toLocaleDateString('nl-NL');
            
            let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Ophaalregistraties</title>
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
                    .summary { margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px; display: flex; gap: 30px; flex-wrap: wrap; }
                    .summary-item { font-size: 13px; }
                    .summary-item strong { color: #2c7da0; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📋 Ophaalregistraties</h1>
                    <p>Gegenereerd op ${datum}</p>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Ziekenhuis</th>
                            <th>Datum</th>
                            <th style="text-align: right;">Gewicht (kg)</th>
                            <th>Opmerkingen</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            data.forEach((r, index) => {
                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${escapeHtml(r.ziekenhuis)}</td>
                        <td>${r.datum}</td>
                        <td style="text-align: right;">${r.gewicht.toFixed(1)}</td>
                        <td>${escapeHtml(r.opmerkingen || '-')}</td>
                    </tr>
                `;
            });
            
            html += `
                    </tbody>
                </table>
                
                <div class="summary">
                    <span class="summary-item"><strong>📋 Totaal registraties:</strong> ${data.length}</span>
                    <span class="summary-item"><strong>⚖️ Totaal gewicht:</strong> ${totaalGewicht.toFixed(1)} kg</span>
                    <span class="summary-item"><strong>🏥 Ziekenhuizen:</strong> ${new Set(data.map(r => r.ziekenhuis)).size}</span>
                </div>
                
                <div class="footer">
                    Route gegenereerd via Abbott Platform
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