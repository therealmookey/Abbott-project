// ===== ADRESSEN FUNCTIES =====

console.log('adressen.js geladen');

window.addEventListener('load', function() {
    console.log('Pagina geladen, supabase beschikbaar?', !!window.supabase);
    
    if (!window.supabase) {
        console.error('Supabase niet beschikbaar');
        return;
    }
    
    const adressenLijst = document.getElementById('adressenLijst');
    const addAddressBtn = document.getElementById('addAddressBtn');
    const addressPopup = document.getElementById('addressPopup');
    const saveAddressBtn = document.getElementById('saveAddressBtn');
    const closeAddressPopup = document.getElementById('closeAddressPopup');
    const popupTitle = document.getElementById('popupTitle');
    const instellingNaam = document.getElementById('instellingNaam');
    const straat = document.getElementById('straat');
    const postcode = document.getElementById('postcode');
    const plaats = document.getElementById('plaats');
    const telefoon = document.getElementById('telefoon');
    
    let currentAddressId = null;
    
    // Laad adressen
    async function laadAdressen() {
        if (!adressenLijst) return;
        
        adressenLijst.innerHTML = '<p>Laden...</p>';
        
        const { data, error } = await window.supabase
            .from('adressen')
            .select('*')
            .order('instelling_naam');
        
        if (error) {
            adressenLijst.innerHTML = `<p class="error">Fout: ${error.message}</p>`;
            return;
        }
        
        if (!data || data.length === 0) {
            adressenLijst.innerHTML = '<p>Geen adressen gevonden. Klik op "+ Nieuw adres" om er een toe te voegen.</p>';
            return;
        }
        
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
        
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => bewerkAdres(btn.dataset.id));
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => verwijderAdres(btn.dataset.id));
        });
    }
    
    // Nieuw adres
    if (addAddressBtn) {
        addAddressBtn.onclick = () => {
            currentAddressId = null;
            popupTitle.textContent = 'Nieuw adres';
            instellingNaam.value = '';
            straat.value = '';
            postcode.value = '';
            plaats.value = '';
            telefoon.value = '';
            addressPopup.style.display = 'flex';
        };
    }
    
    // Bewerk adres
    async function bewerkAdres(id) {
        const { data, error } = await window.supabase
            .from('adressen')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) {
            alert('Fout: ' + error.message);
            return;
        }
        
        currentAddressId = id;
        popupTitle.textContent = 'Adres bewerken';
        instellingNaam.value = data.instelling_naam;
        straat.value = data.straat;
        postcode.value = data.postcode;
        plaats.value = data.plaats;
        telefoon.value = data.telefoon || '';
        addressPopup.style.display = 'flex';
    }
    
    // Opslaan
    if (saveAddressBtn) {
        saveAddressBtn.onclick = async () => {
            if (!instellingNaam.value || !straat.value || !postcode.value || !plaats.value) {
                alert('Vul alle verplichte velden in');
                return;
            }
            
            const adresData = {
                instelling_naam: instellingNaam.value,
                straat: straat.value,
                postcode: postcode.value,
                plaats: plaats.value,
                telefoon: telefoon.value || null
            };
            
            let error;
            if (currentAddressId) {
                const result = await window.supabase
                    .from('adressen')
                    .update(adresData)
                    .eq('id', currentAddressId);
                error = result.error;
            } else {
                const result = await window.supabase
                    .from('adressen')
                    .insert([adresData]);
                error = result.error;
            }
            
            if (error) {
                alert('Fout: ' + error.message);
            } else {
                addressPopup.style.display = 'none';
                laadAdressen();
            }
        };
    }
    
    // Verwijderen
    async function verwijderAdres(id) {
        if (!confirm('Weet je zeker dat je dit adres wilt verwijderen?')) return;
        
        const { error } = await window.supabase
            .from('adressen')
            .delete()
            .eq('id', id);
        
        if (error) {
            alert('Fout: ' + error.message);
        } else {
            laadAdressen();
        }
    }
    
    // Popup sluiten
    if (closeAddressPopup) {
        closeAddressPopup.onclick = () => {
            addressPopup.style.display = 'none';
        };
    }
    
    window.onclick = (e) => {
        if (e.target === addressPopup) {
            addressPopup.style.display = 'none';
        }
    };
    
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Start
    laadAdressen();
    
});