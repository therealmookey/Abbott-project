// ===== STOCK MANAGEMENT FUNCTIES =====

console.log('stock.js geladen');

document.addEventListener('DOMContentLoaded', function() {
    
    if (!window.supabase) {
        console.error('Supabase niet beschikbaar!');
        return;
    }
    
    // DOM elementen
    const stockLijst = document.getElementById('stockLijst');
    const addItemBtn = document.getElementById('addItemBtn');
    const addCombinatieBtn = document.getElementById('addCombinatieBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const itemPopup = document.getElementById('itemPopup');
    const saveItemBtn = document.getElementById('saveItemBtn');
    const closeItemPopup = document.getElementById('closeItemPopup');
    const popupTitle = document.getElementById('popupTitle');
    const combinatiePopup = document.getElementById('combinatiePopup');
    const saveCombinatieBtn = document.getElementById('saveCombinatieBtn');
    const closeCombinatiePopup = document.getElementById('closeCombinatiePopup');
    const combinatiePopupTitle = document.getElementById('combinatiePopupTitle');
    const componentSelect = document.getElementById('componentSelect');
    const componentAantal = document.getElementById('componentAantal');
    const addComponentBtn = document.getElementById('addComponentBtn');
    const componentenLijst = document.getElementById('componentenLijst');
    const searchStock = document.getElementById('searchStock');
    const statusFilter = document.getElementById('statusFilter');
    const typeFilter = document.getElementById('typeFilter');
    const filterBtn = document.getElementById('filterBtn');
    const resetFilterBtn = document.getElementById('resetFilterBtn');
    const stockAlerts = document.getElementById('stockAlerts');
    
    // Mutatie popup
    const mutatiePopup = document.getElementById('mutatiePopup');
    const saveMutatieBtn = document.getElementById('saveMutatieBtn');
    const closeMutatiePopup = document.getElementById('closeMutatiePopup');
    const mutatieItemName = document.getElementById('mutatieItemName');
    const mutatieHuidigAantal = document.getElementById('mutatieHuidigAantal');
    const mutatieType = document.getElementById('mutatieType');
    const mutatieAantalDiv = document.getElementById('mutatieAantalDiv');
    const mutatieAantal = document.getElementById('mutatieAantal');
    const mutatieCorrectieDiv = document.getElementById('mutatieCorrectieDiv');
    const mutatieCorrectieAantal = document.getElementById('mutatieCorrectieAantal');
    const mutatieReden = document.getElementById('mutatieReden');
    
    let currentItemId = null;
    let currentCombinatieId = null;
    let currentMutatieItemId = null;
    let alleItems = [];
    let componentenLijstData = [];
    let combinatieComponenten = [];
    
    // ===== MELDINGEN =====
    function showAlerts(items) {
        if (!stockAlerts) return;
        
        const lowItems = items.filter(item => item.aantal <= item.minimum_stock && item.aantal > 0);
        const outItems = items.filter(item => item.aantal === 0);
        
        let alertsHtml = '';
        
        if (lowItems.length > 0) {
            alertsHtml += `<div class="alert alert-warning">⚠️ <strong>Laag op voorraad!</strong> ${lowItems.length} item(s) zijn onder de minimum voorraad:</div>`;
            alertsHtml += '<ul class="alert-list">';
            lowItems.forEach(item => {
                alertsHtml += `<li><strong>${item.item_code}</strong> - ${item.omschrijving}: ${item.aantal} stuks (minimum: ${item.minimum_stock})</li>`;
            });
            alertsHtml += '</ul>';
        }
        
        if (outItems.length > 0) {
            alertsHtml += `<div class="alert alert-danger">🚨 <strong>Op voorraad!</strong> ${outItems.length} item(s) zijn volledig op voorraad:</div>`;
            alertsHtml += '<ul class="alert-list">';
            outItems.forEach(item => {
                alertsHtml += `<li><strong>${item.item_code}</strong> - ${item.omschrijving}: <strong>0 stuks</strong> (actie vereist!)</li>`;
            });
            alertsHtml += '</ul>';
        }
        
        if (!alertsHtml) {
            alertsHtml = `<div class="alert alert-success">✅ Alles op voorraad! Geen tekorten.</div>`;
        }
        
        stockAlerts.innerHTML = alertsHtml;
    }
    
    // ===== LAAD ITEMS =====
    async function laadItems() {
        if (!stockLijst) return;
        
        stockLijst.innerHTML = '<p>Bezig met laden...</p>';
        
        try {
            const { data, error } = await window.supabase
                .from('stock_items')
                .select('*')
                .order('item_code', { ascending: true });
            
            if (error) throw error;
            
            alleItems = data || [];
            
            // Haal combinatie componenten op
            const { data: compData, error: compError } = await window.supabase
                .from('combinatie_componenten')
                .select('*');
            
            if (compError) throw compError;
            combinatieComponenten = compData || [];
            
            // Filter items
            let filteredData = [...alleItems];
            
            const zoekterm = searchStock?.value?.trim().toLowerCase();
            if (zoekterm) {
                filteredData = filteredData.filter(item => 
                    item.item_code.toLowerCase().includes(zoekterm) ||
                    item.omschrijving.toLowerCase().includes(zoekterm)
                );
            }
            
            const type = typeFilter?.value;
            if (type === 'combinatie') {
                const combinatieIds = combinatieComponenten.map(c => c.combinatie_id);
                filteredData = filteredData.filter(item => combinatieIds.includes(item.id));
            } else if (type === 'enkel') {
                const combinatieIds = combinatieComponenten.map(c => c.combinatie_id);
                filteredData = filteredData.filter(item => !combinatieIds.includes(item.id));
            }
            
            const status = statusFilter?.value;
            if (status === 'laag') {
                filteredData = filteredData.filter(item => item.aantal <= item.minimum_stock && item.aantal > 0);
            } else if (status === 'op') {
                filteredData = filteredData.filter(item => item.aantal === 0);
            } else if (status === 'voorraad') {
                filteredData = filteredData.filter(item => item.aantal > item.minimum_stock);
            }
            
            showAlerts(alleItems);
            
            if (filteredData.length === 0) {
                stockLijst.innerHTML = '<p>Geen items gevonden.</p>';
                return;
            }
            
            let html = `
                <div style="overflow-x: auto;">
                <table style="width:100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #2c7da0; color: white;">
                            <th style="padding: 10px; text-align: left;">Code</th>
                            <th style="padding: 10px; text-align: left;">Omschrijving</th>
                            <th style="padding: 10px; text-align: left;">Type</th>
                            <th style="padding: 10px; text-align: right;">Aantal</th>
                            <th style="padding: 10px; text-align: right;">Minimum</th>
                            <th style="padding: 10px; text-align: left;">Status</th>
                            <th style="padding: 10px; text-align: center;">Acties</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            const combinatieIds = combinatieComponenten.map(c => c.combinatie_id);
            
            for (const item of filteredData) {
                const isCombinatie = combinatieIds.includes(item.id);
                let typeLabel = isCombinatie ? '🔗 Combinatie' : '📦 Los';
                let statusClass = 'status-voldoende';
                let statusText = '✅ Voldoende';
                
                if (item.aantal === 0) {
                    statusClass = 'status-op';
                    statusText = '🚨 Op voorraad!';
                } else if (item.aantal <= item.minimum_stock) {
                    statusClass = 'status-laag';
                    statusText = '⚠️ Laag';
                }
                
                // Toon componenten voor combinatie
                let componentInfo = '';
                if (isCombinatie) {
                    const comps = combinatieComponenten.filter(c => c.combinatie_id === item.id);
                    if (comps.length > 0) {
                        componentInfo = '<div style="font-size:0.75rem;color:#6c757d;margin-top:4px;">';
                        comps.forEach(comp => {
                            const compItem = alleItems.find(i => i.id === comp.component_id);
                            if (compItem) {
                                componentInfo += `${compItem.item_code} x${comp.aantal} `;
                            }
                        });
                        componentInfo += '</div>';
                    }
                }
                
                html += `
                    <tr style="border-bottom: 1px solid #e9ecef;">
                        <td style="padding: 10px;"><strong>${escapeHtml(item.item_code)}</strong></td>
                        <td style="padding: 10px;">
                            ${escapeHtml(item.omschrijving)}
                            ${componentInfo}
                        </td>
                        <td style="padding: 10px;">${typeLabel}</td>
                        <td style="padding: 10px; text-align: right;"><strong>${item.aantal}</strong></td>
                        <td style="padding: 10px; text-align: right;">${item.minimum_stock}</td>
                        <td style="padding: 10px;"><span class="stock-status ${statusClass}">${statusText}</span></td>
                        <td style="padding: 10px; text-align: center;">
                            <button class="btn btn-secondary mutatie-btn" data-id="${item.id}" style="margin-right: 5px;">📦</button>
                            ${isCombinatie ? `<button class="btn btn-info comp-btn" data-id="${item.id}" style="margin-right: 5px;">🔗</button>` : ''}
                            <button class="btn btn-secondary edit-btn" data-id="${item.id}" style="margin-right: 5px;">✏️</button>
                            <button class="btn btn-danger delete-btn" data-id="${item.id}">🗑️</button>
                        </td>
                    </tr>
                `;
            }
            
            html += `
                    </tbody>
                </table>
                </div>
                <div style="margin-top: 10px; color: #6c757d; font-size: 0.9rem;">
                    <strong>Totaal items:</strong> ${filteredData.length} 
                    | <strong>Totale voorraad:</strong> ${filteredData.reduce((sum, i) => sum + i.aantal, 0)} stuks
                </div>
            `;
            
            stockLijst.innerHTML = html;
            
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', () => bewerkItem(btn.dataset.id));
            });
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', () => verwijderItem(btn.dataset.id));
            });
            document.querySelectorAll('.mutatie-btn').forEach(btn => {
                btn.addEventListener('click', () => openMutatiePopup(btn.dataset.id));
            });
            document.querySelectorAll('.comp-btn').forEach(btn => {
                btn.addEventListener('click', () => toonCombinatieDetails(btn.dataset.id));
            });
            
        } catch (err) {
            console.error('Fout:', err);
            stockLijst.innerHTML = `<p class="error">Fout: ${err.message}</p>`;
        }
    }
    
    // ===== ITEM CRUD =====
    if (addItemBtn) {
        addItemBtn.addEventListener('click', () => {
            currentItemId = null;
            popupTitle.textContent = 'Nieuw item';
            document.getElementById('itemCode').value = '';
            document.getElementById('itemOmschrijving').value = '';
            document.getElementById('itemAantal').value = '0';
            document.getElementById('itemMinimum').value = '5';
            document.getElementById('itemLocatie').value = '';
            itemPopup.style.display = 'flex';
        });
    }
    
    async function bewerkItem(id) {
        try {
            const { data, error } = await window.supabase
                .from('stock_items')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            
            currentItemId = id;
            popupTitle.textContent = 'Item bewerken';
            document.getElementById('itemCode').value = data.item_code;
            document.getElementById('itemOmschrijving').value = data.omschrijving;
            document.getElementById('itemAantal').value = data.aantal;
            document.getElementById('itemMinimum').value = data.minimum_stock;
            document.getElementById('itemLocatie').value = data.locatie || '';
            itemPopup.style.display = 'flex';
            
        } catch (err) {
            alert('Fout: ' + err.message);
        }
    }
    
    async function verwijderItem(id) {
        if (!confirm('Weet je zeker dat je dit item wilt verwijderen?')) return;
        
        try {
            const { error } = await window.supabase
                .from('stock_items')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            alert('Item verwijderd');
            laadItems();
            
        } catch (err) {
            alert('Fout: ' + err.message);
        }
    }
    
    if (saveItemBtn) {
        saveItemBtn.addEventListener('click', async () => {
            const code = document.getElementById('itemCode').value.trim();
            const omschrijving = document.getElementById('itemOmschrijving').value.trim();
            const aantal = parseInt(document.getElementById('itemAantal').value) || 0;
            const minimum = parseInt(document.getElementById('itemMinimum').value) || 0;
            const locatie = document.getElementById('itemLocatie').value.trim();
            
            if (!code || !omschrijving) {
                alert('Code en omschrijving zijn verplicht');
                return;
            }
            
            const itemData = {
                item_code: code,
                omschrijving: omschrijving,
                aantal: aantal,
                minimum_stock: minimum,
                locatie: locatie || null
            };
            
            try {
                let error;
                if (currentItemId) {
                    const result = await window.supabase
                        .from('stock_items')
                        .update(itemData)
                        .eq('id', currentItemId);
                    error = result.error;
                } else {
                    const result = await window.supabase
                        .from('stock_items')
                        .insert([itemData]);
                    error = result.error;
                }
                
                if (error) throw error;
                
                itemPopup.style.display = 'none';
                laadItems();
                
            } catch (err) {
                alert('Fout: ' + err.message);
            }
        });
    }
    
    if (closeItemPopup) {
        closeItemPopup.addEventListener('click', () => {
            itemPopup.style.display = 'none';
        });
    }
    
    // ===== COMBINATIE FUNCTIES =====
    if (addCombinatieBtn) {
        addCombinatieBtn.addEventListener('click', async () => {
            currentCombinatieId = null;
            combinatiePopupTitle.textContent = 'Nieuwe combinatie';
            document.getElementById('combinatieCode').value = '';
            document.getElementById('combinatieOmschrijving').value = '';
            document.getElementById('combinatieMinimum').value = '5';
            document.getElementById('combinatieLocatie').value = '';
            componentenLijstData = [];
            toonComponentenLijst();
            await vulComponentDropdown();
            combinatiePopup.style.display = 'flex';
        });
    }
    
    async function vulComponentDropdown() {
        if (!componentSelect) return;
        const { data, error } = await window.supabase
            .from('stock_items')
            .select('id, item_code, omschrijving')
            .not('id', 'in', '(select combinatie_id from combinatie_componenten)')
            .order('item_code');
        
        if (error) {
            console.error('Fout:', error);
            return;
        }
        
        componentSelect.innerHTML = '<option value="">Kies een component...</option>';
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = `${item.item_code} - ${item.omschrijving}`;
            componentSelect.appendChild(option);
        });
    }
    
    function toonComponentenLijst() {
        if (!componentenLijst) return;
        if (componentenLijstData.length === 0) {
            componentenLijst.innerHTML = '<p>Geen componenten toegevoegd.</p>';
            return;
        }
        
        let html = '<ul style="list-style:none;padding:0;">';
        componentenLijstData.forEach((comp, index) => {
            html += `
                <li style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:#f8f9fa;margin-bottom:4px;border-radius:4px;">
                    <span><strong>${comp.code}</strong> - ${comp.omschrijving} x ${comp.aantal}</span>
                    <button class="btn btn-danger remove-component-btn" data-index="${index}" style="padding:2px 8px;font-size:0.7rem;">✖</button>
                </li>
            `;
        });
        html += '</ul>';
        componentenLijst.innerHTML = html;
        
        document.querySelectorAll('.remove-component-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                componentenLijstData.splice(index, 1);
                toonComponentenLijst();
            });
        });
    }
    
    if (addComponentBtn) {
        addComponentBtn.addEventListener('click', () => {
            const compId = parseInt(componentSelect.value);
            const aantal = parseInt(componentAantal.value) || 1;
            
            if (!compId) {
                alert('Selecteer een component');
                return;
            }
            
            if (componentenLijstData.some(c => c.id === compId)) {
                alert('Deze component is al toegevoegd');
                return;
            }
            
            const compItem = alleItems.find(i => i.id === compId);
            if (compItem) {
                componentenLijstData.push({
                    id: compId,
                    code: compItem.item_code,
                    omschrijving: compItem.omschrijving,
                    aantal: aantal
                });
                toonComponentenLijst();
            }
        });
    }
    
    if (saveCombinatieBtn) {
        saveCombinatieBtn.addEventListener('click', async () => {
            const code = document.getElementById('combinatieCode').value.trim();
            const omschrijving = document.getElementById('combinatieOmschrijving').value.trim();
            const minimum = parseInt(document.getElementById('combinatieMinimum').value) || 5;
            const locatie = document.getElementById('combinatieLocatie').value.trim();
            
            if (!code || !omschrijving) {
                alert('Code en omschrijving zijn verplicht');
                return;
            }
            
            if (componentenLijstData.length === 0) {
                alert('Voeg minstens één component toe');
                return;
            }
            
            try {
                // Maak het combinatie item aan
                const { data: itemData, error: itemError } = await window.supabase
                    .from('stock_items')
                    .insert([{
                        item_code: code,
                        omschrijving: omschrijving,
                        aantal: 0,
                        minimum_stock: minimum,
                        locatie: locatie || null
                    }])
                    .select();
                
                if (itemError) throw itemError;
                
                const combinatieId = itemData[0].id;
                
                // Voeg componenten toe
                const compData = componentenLijstData.map(comp => ({
                    combinatie_id: combinatieId,
                    component_id: comp.id,
                    aantal: comp.aantal
                }));
                
                const { error: compError } = await window.supabase
                    .from('combinatie_componenten')
                    .insert(compData);
                
                if (compError) throw compError;
                
                alert('Combinatie aangemaakt!');
                combinatiePopup.style.display = 'none';
                laadItems();
                
            } catch (err) {
                alert('Fout: ' + err.message);
            }
        });
    }
    
    if (closeCombinatiePopup) {
        closeCombinatiePopup.addEventListener('click', () => {
            combinatiePopup.style.display = 'none';
        });
    }
    
    // ===== MUTATIE FUNCTIES (aangepast voor combinaties) =====
    
    async function openMutatiePopup(itemId) {
        try {
            const { data, error } = await window.supabase
                .from('stock_items')
                .select('*')
                .eq('id', itemId)
                .single();
            
            if (error) throw error;
            
            currentMutatieItemId = itemId;
            mutatieItemName.textContent = `${data.item_code} - ${data.omschrijving}`;
            mutatieHuidigAantal.textContent = data.aantal;
            mutatieAantal.value = '1';
            mutatieCorrectieAantal.value = data.aantal;
            mutatieReden.value = '';
            mutatieType.value = 'toevoeging';
            mutatieAantalDiv.style.display = 'block';
            mutatieCorrectieDiv.style.display = 'none';
            mutatiePopup.style.display = 'flex';
            
        } catch (err) {
            alert('Fout: ' + err.message);
        }
    }
    
    if (mutatieType) {
        mutatieType.addEventListener('change', () => {
            if (mutatieType.value === 'correctie') {
                mutatieAantalDiv.style.display = 'none';
                mutatieCorrectieDiv.style.display = 'block';
            } else {
                mutatieAantalDiv.style.display = 'block';
                mutatieCorrectieDiv.style.display = 'none';
            }
        });
    }
    
    if (saveMutatieBtn) {
        saveMutatieBtn.addEventListener('click', async () => {
            const type = mutatieType.value;
            const reden = mutatieReden.value.trim() || 'Geen reden opgegeven';
            
            const { data: item, error: itemError } = await window.supabase
                .from('stock_items')
                .select('*')
                .eq('id', currentMutatieItemId)
                .single();
            
            if (itemError) {
                alert('Fout: ' + itemError.message);
                return;
            }
            
            let newAantal = item.aantal;
            let mutatieAantalValue = 0;
            
            if (type === 'correctie') {
                mutatieAantalValue = parseInt(mutatieCorrectieAantal.value) || 0;
                newAantal = mutatieAantalValue;
            } else {
                const delta = parseInt(mutatieAantal.value) || 0;
                if (delta <= 0) {
                    alert('Aantal moet groter zijn dan 0');
                    return;
                }
                mutatieAantalValue = delta;
                
                if (type === 'toevoeging') {
                    newAantal = item.aantal + delta;
                } else if (type === 'afname') {
                    if (delta > item.aantal) {
                        alert(`Niet genoeg voorraad! Huidige voorraad: ${item.aantal} stuks`);
                        return;
                    }
                    newAantal = item.aantal - delta;
                }
            }
            
            try {
                // Update item
                const { error: updateError } = await window.supabase
                    .from('stock_items')
                    .update({ aantal: newAantal })
                    .eq('id', currentMutatieItemId);
                
                if (updateError) throw updateError;
                
                // Log mutatie
                const { error: logError } = await window.supabase
                    .from('stock_mutaties')
                    .insert([{
                        item_id: currentMutatieItemId,
                        type: type,
                        aantal: mutatieAantalValue,
                        reden: reden,
                        geregistreerd_door: (await window.supabase.auth.getUser()).data.user?.id
                    }]);
                
                if (logError) throw logError;
                
                // ===== ALS HET EEN COMBINATIE IS, UPDATE OOK DE COMPONENTEN =====
                if (type === 'afname') {
                    const comps = await window.supabase
                        .from('combinatie_componenten')
                        .select('*')
                        .eq('combinatie_id', currentMutatieItemId);
                    
                    if (comps.data && comps.data.length > 0) {
                        for (const comp of comps.data) {
                            const { data: compItem } = await window.supabase
                                .from('stock_items')
                                .select('aantal')
                                .eq('id', comp.component_id)
                                .single();
                            
                            if (compItem) {
                                const nieuwCompAantal = compItem.aantal - (comp.aantal * delta);
                                if (nieuwCompAantal < 0) {
                                    alert(`Waarschuwing: ${compItem.omschrijving} heeft niet genoeg voorraad!`);
                                }
                                await window.supabase
                                    .from('stock_items')
                                    .update({ aantal: Math.max(0, nieuwCompAantal) })
                                    .eq('id', comp.component_id);
                            }
                        }
                    }
                }
                
                alert('Voorraad bijgewerkt!');
                mutatiePopup.style.display = 'none';
                laadItems();
                
            } catch (err) {
                alert('Fout: ' + err.message);
            }
        });
    }
    
    if (closeMutatiePopup) {
        closeMutatiePopup.addEventListener('click', () => {
            mutatiePopup.style.display = 'none';
        });
    }
    
    // ===== TOON COMBINATIE DETAILS =====
    function toonCombinatieDetails(id) {
        const comps = combinatieComponenten.filter(c => c.combinatie_id === id);
        if (comps.length === 0) {
            alert('Geen componenten gevonden voor deze combinatie.');
            return;
        }
        
        let msg = '🔗 **Componenten van deze combinatie:**\n\n';
        comps.forEach(comp => {
            const item = alleItems.find(i => i.id === comp.component_id);
            if (item) {
                msg += `• ${item.item_code} - ${item.omschrijving} (x${comp.aantal})\n`;
                msg += `  Voorraad: ${item.aantal} stuks\n\n`;
            }
        });
        alert(msg);
    }
    
    // ===== FILTERS =====
    if (filterBtn) {
        filterBtn.addEventListener('click', laadItems);
    }
    
    if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', () => {
            searchStock.value = '';
            statusFilter.value = 'alles';
            typeFilter.value = 'alles';
            laadItems();
        });
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', laadItems);
    }
    
    if (searchStock) {
        searchStock.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                laadItems();
            }
        });
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === itemPopup) itemPopup.style.display = 'none';
        if (e.target === combinatiePopup) combinatiePopup.style.display = 'none';
        if (e.target === mutatiePopup) mutatiePopup.style.display = 'none';
    });
    
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Initialiseer
    laadItems();
    
});