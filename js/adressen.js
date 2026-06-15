// ===== ADRESSEN FUNCTIES MET LIJSTWEGAVE =====

console.log('adressen.js geladen');

document.addEventListener('DOMContentLoaded', function() {
    
    if (!window.supabase) {
        console.error('Supabase niet beschikbaar!');
        return;
    }
    
    console.log('Supabase beschikbaar, start adressen pagina');
    
    const adressenLijst = document.getElementById('adressenLijst');
    const addAddressBtn = document.getElementById('addAddressBtn');
    const addressPopup = document.getElementById('addressPopup');
    const saveAddressBtn = document.getElementById('saveAddressBtn');
    const closeAddressPopup = document.getElementById('closeAddressPopup');
    const popupTitle = document.getElementById('popupTitle');
    
    let currentAddressId = null;
    
    function getValue(id) {
        const el = document.getElementById(id);
        return el ? el.value : '';
    }
    
    function setValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    }
    
    async function laadAdressen() {
        if (!adressenLijst) return;
        
        console.log('Adressen laden...');
        adressenLijst.innerHTML = '<p>Bezig met laden...</p>';
        
        try {
            const { data, error } = await window.supabase
                .from('adressen')
                .select('*')
                .order('instelling_naam');
            
            if (error) {
                console.error('Fout bij laden:', error);
                adressenLijst.innerHTML = `<p class="error">Fout bij laden: ${error.message}</p>`;
                return;
            }
            
            if (!data || data.length === 0) {
                adressenLijst.innerHTML = '<p>Geen adressen gevonden. Klik op "+ Nieuw adres" om er een toe te voegen.</p>';
                return;
            }
            
            // Tabel weergave
            let html = `
                <table>
                    <thead>
                        <tr>
                            <th>Instelling</th>
                            <th>Adres</th>
                            <th>Postcode/Plaats</th>
                            <th>Contact</th>
                            <th>Extra info</th>
                            <th>Acties</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            data.forEach(adres => {
                html += `
                    <tr>
                        <td><strong>${escapeHtml(adres.instelling_naam)}</strong></td>
                        <td>${escapeHtml(adres.straat)}</td>
                        <td>${escapeHtml(adres.postcode)}<br>${escapeHtml(adres.plaats)}</td>
                        <td>${adres.telefoon ? escapeHtml(adres.telefoon) : '-'}</td>
                        <td>${adres.extra_info ? escapeHtml(adres.extra_info.substring(0, 100)) + (adres.extra_info.length > 100 ? '...' : '') : '-'}</td>
                        <td class="adres-buttons">
                            <button class="btn btn-secondary edit-btn" data-id="${adres.id}">✏️ Bewerken</button>
                            <button class="btn btn-danger delete-btn" data-id="${adres.id}">🗑️ Verwijderen</button>
                        </td>
                    </tr>
                `;
            });
            
            html += `
                    </tbody>
                </table>
            `;
            
            adressenLijst.innerHTML = html;
            
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', () => bewerkAdres(btn.dataset.id));
            });
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', () => verwijderAdres(btn.dataset.id));
            });
            
        } catch (err) {
            console.error('Exception:', err);
            adressenLijst.innerHTML = `<p class="error">Fout: ${err.message}</p>`;
        }
    }
    
    if (addAddressBtn) {
        addAddressBtn.addEventListener('click', () => {
            currentAddressId = null;
            popupTitle.textContent = 'Nieuw adres';
            setValue('instellingNaam', '');
            setValue('straat', '');
            setValue('postcode', '');
            setValue('plaats', '');
            setValue('telefoon', '');
            setValue('extra_info', '');
            addressPopup.style.display = 'flex';
        });
    }
    
    async function bewerkAdres(id) {
        try {
            const { data, error } = await window.supabase
                .from('adressen')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) {
                alert('Fout bij laden: ' + error.message);
                return;
            }
            
            currentAddressId = id;
            popupTitle.textContent = 'Adres bewerken';
            setValue('instellingNaam', data.instelling_naam);
            setValue('straat', data.straat);
            setValue('postcode', data.postcode);
            setValue('plaats', data.plaats);
            setValue('telefoon', data.telefoon || '');
            setValue('extra_info', data.extra_info || '');
            addressPopup.style.display = 'flex';
        } catch (err) {
            alert('Fout: ' + err.message);
        }
    }
    
    if (saveAddressBtn) {
        saveAddressBtn.addEventListener('click', async () => {
            const instellingNaam = getValue('instellingNaam');
            const straat = getValue('straat');
            const postcode = getValue('postcode');
            const plaats = getValue('plaats');
            const telefoon = getValue('telefoon');
            const extra_info = getValue('extra_info');
            
            if (!instellingNaam || !straat || !postcode || !plaats) {
                alert('Vul alle verplichte velden in');
                return;
            }
            
            const adresData = {
                instelling_naam: instellingNaam,
                straat: straat,
                postcode: postcode,
                plaats: plaats,
                telefoon: telefoon || null,
                extra_info: extra_info || null
            };
            
            try {
                let result;
                if (currentAddressId) {
                    result = await window.supabase
                        .from('adressen')
                        .update(adresData)
                        .eq('id', currentAddressId);
                } else {
                    result = await window.supabase
                        .from('adressen')
                        .insert([adresData]);
                }
                
                if (result.error) {
                    alert('Fout bij opslaan: ' + result.error.message);
                } else {
                    console.log('Opgeslagen! Status:', result.status);
                    addressPopup.style.display = 'none';
                    await laadAdressen();
                }
            } catch (err) {
                alert('Fout: ' + err.message);
            }
        });
    }
    
    async function verwijderAdres(id) {
        if (!confirm('Weet je zeker dat je dit adres wilt verwijderen?')) return;
        
        try {
            const { error } = await window.supabase
                .from('adressen')
                .delete()
                .eq('id', id);
            
            if (error) {
                alert('Fout bij verwijderen: ' + error.message);
            } else {
                await laadAdressen();
            }
        } catch (err) {
            alert('Fout: ' + err.message);
        }
    }
    
    if (closeAddressPopup) {
        closeAddressPopup.addEventListener('click', () => {
            addressPopup.style.display = 'none';
        });
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === addressPopup) {
            addressPopup.style.display = 'none';
        }
    });
    
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    laadAdressen();
    
});
