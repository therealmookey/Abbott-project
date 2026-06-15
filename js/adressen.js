// ===== ADRESSEN FUNCTIES =====

checkAuth();

const adressenLijst = document.getElementById('adressenLijst');
const addAddressBtn = document.getElementById('addAddressBtn');
const addressPopup = document.getElementById('addressPopup');
const saveAddressBtn = document.getElementById('saveAddressBtn');
const closeAddressPopup = document.getElementById('closeAddressPopup');
const popupTitle = document.getElementById('popupTitle');

let currentAddressId = null;

async function laadAdressen() {
    if (!adressenLijst) return;
    
    adressenLijst.innerHTML = '<p>Laden...</p>';
    
    const { data, error } = await supabase
        .from('adressen')
        .select('*')
        .order('instelling_naam');
    
    if (error) {
        adressenLijst.innerHTML = `<p class="error">Fout bij laden: ${error.message}</p>`;
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

if (addAddressBtn) {
    addAddressBtn.addEventListener('click', () => {
        currentAddressId = null;
        popupTitle.textContent = 'Nieuw adres';
        document.getElementById('instellingNaam').value = '';
        document.getElementById('straat').value = '';
        document.getElementById('postcode').value = '';
        document.getElementById('plaats').value = '';
        document.getElementById('telefoon').value = '';
        addressPopup.style.display = 'flex';
    });
}

async function bewerkAdres(id) {
    const { data, error } = await supabase
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
    document.getElementById('instellingNaam').value = data.instelling_naam;
    document.getElementById('straat').value = data.straat;
    document.getElementById('postcode').value = data.postcode;
    document.getElementById('plaats').value = data.plaats;
    document.getElementById('telefoon').value = data.telefoon || '';
    addressPopup.style.display = 'flex';
}

if (saveAddressBtn) {
    saveAddressBtn.addEventListener('click', async () => {
        const instellingNaam = document.getElementById('instellingNaam').value;
        const straat = document.getElementById('straat').value;
        const postcode = document.getElementById('postcode').value;
        const plaats = document.getElementById('plaats').value;
        const telefoon = document.getElementById('telefoon').value;
        
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
        
        let error;
        if (currentAddressId) {
            const result = await supabase
                .from('adressen')
                .update(adresData)
                .eq('id', currentAddressId);
            error = result.error;
        } else {
            const result = await supabase
                .from('adressen')
                .insert([adresData]);
            error = result.error;
        }
        
        if (error) {
            alert('Fout bij opslaan: ' + error.message);
        } else {
            addressPopup.style.display = 'none';
            laadAdressen();
        }
    });
}

async function verwijderAdres(id) {
    if (!confirm('Weet je zeker dat je dit adres wilt verwijderen?')) return;
    
    const { error } = await supabase
        .from('adressen')
        .delete()
        .eq('id', id);
    
    if (error) {
        alert('Fout bij verwijderen: ' + error.message);
    } else {
        laadAdressen();
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