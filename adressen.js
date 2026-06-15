// ===== ADRESSEN FUNCTIES (WERKENDE VERSIE) =====

console.log('adressen.js geladen');

// Wacht tot de DOM klaar is
document.addEventListener('DOMContentLoaded', function() {
    
    if (!window.supabase) {
        console.error('Supabase niet beschikbaar!');
        return;
    }
    
    console.log('Supabase beschikbaar, start adressen pagina');
    
    // DOM elementen
    const adressenLijst = document.getElementById('adressenLijst');
    const addAddressBtn = document.getElementById('addAddressBtn');
    const addressPopup = document.getElementById('addressPopup');
    const saveAddressBtn = document.getElementById('saveAddressBtn');
    const closeAddressPopup = document.getElementById('closeAddressPopup');
    const popupTitle = document.getElementById('popupTitle');
    
    let currentAddressId = null;
    
    // Helper om waarden te krijgen
    function getValue(id) {
        const el = document.getElementById(id);
        return el ? el.value : '';
    }
    
    // Helper om waarden te zetten
    function setValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    }
    
    // Adressen laden
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
            
            console.log('Aantal adressen geladen:', data?.length || 0);
            
            if (!data || data.length === 0) {
                adressenLijst.innerHTML = '<p>Geen adressen gevonden. Klik op "+ Nieuw adres" om er een toe te voegen.</p>';
                return;
            }
            
            // Toon de adressen
            adressenLijst.innerHTML = '';
            data.forEach(adres => {
                const card = document.createElement('div');
                card.className = 'adres-card';
                card.innerHTML = `
                    <h3>${escapeHtml(adres.instelling_naam)}</h3>
                    <p>📍 ${escapeHtml(adres.straat)}</p>
                    <p>📮 ${escapeHtml(adres.postcode)} ${escapeHtml(adres.plaats)}</p>
                    ${adres.telefoon ? `<p>📞 ${escapeHtml(adres.telefoon)}</p>` : ''}
                    <div class="adres-buttons">
                        <button class="btn btn-secondary edit-btn" data-id="${adres.id}">✏️ Bewerken</button>
                        <button class="btn btn-danger delete-btn" data-id="${adres.id}">🗑️ Verwijderen</button>
                    </div>
                `;
                adressenLijst.appendChild(card);
            });
            
            // Event listeners voor bewerken en verwijderen
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
    
    // Nieuw adres formulier tonen
    if (addAddressBtn) {
        addAddressBtn.addEventListener('click', () => {
            currentAddressId = null;
            popupTitle.textContent = 'Nieuw adres';
            setValue('instellingNaam', '');
            setValue('straat', '');
            setValue('postcode', '');
            setValue('plaats', '');
            setValue('telefoon', '');
            addressPopup.style.display = 'flex';
        });
    }
    
    // Adres bewerken
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
            addressPopup.style.display = 'flex';
        } catch (err) {
            alert('Fout: ' + err.message);
        }
    }
    
    // Opslaan (nieuw of bewerken)
    if (saveAddressBtn) {
        saveAddressBtn.addEventListener('click', async () => {
            const instellingNaam = getValue('instellingNaam');
            const straat = getValue('straat');
            const postcode = getValue('postcode');
            const plaats = getValue('plaats');
            const telefoon = getValue('telefoon');
            
            if (!instellingNaam || !straat || !postcode || !plaats) {
                alert('Vul alle verplichte velden in');
                return;
            }
            
            const adresData = {
                instelling_naam: instellingNaam,
                straat: straat,
                postcode: postcode,
                plaats: plaats,
                telefoon: telefoon || null
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
                    await laadAdressen(); // Herlaad de lijst
                }
            } catch (err) {
                alert('Fout: ' + err.message);
            }
        });
    }
    
    // Adres verwijderen
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
                await laadAdressen(); // Herlaad de lijst
            }
        } catch (err) {
            alert('Fout: ' + err.message);
        }
    }
    
    // Popup sluiten
    if (closeAddressPopup) {
        closeAddressPopup.addEventListener('click', () => {
            addressPopup.style.display = 'none';
        });
    }
    
    // Klik buiten popup sluiten
    window.addEventListener('click', (e) => {
        if (e.target === addressPopup) {
            addressPopup.style.display = 'none';
        }
    });
    
    // HTML escaping
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Start de pagina
    console.log('Adressen pagina start, laden...');
    laadAdressen();
    
});