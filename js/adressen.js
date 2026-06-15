// ===== ADRESSEN FUNCTIES MET ZOEKFUNCTIE =====

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
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const searchResultCount = document.getElementById('searchResultCount');
    
    let currentAddressId = null;
    let alleAdressen = []; // Bewaar alle adressen voor zoeken
    let huidigeZoekterm = '';
    
    function getValue(id) {
        const el = document.getElementById(id);
        return el ? el.value : '';
    }
    
    function setValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    }
    
    // Zoekfunctie
    function filterAdressen(zoekterm) {
        if (!zoekterm || zoekterm.trim() === '') {
            return alleAdressen;
        }
        
        const term = zoekterm.toLowerCase().trim();
        return alleAdressen.filter(adres => {
            return (
                (adres.instelling_naam && adres.instelling_naam.toLowerCase().includes(term)) ||
                (adres.straat && adres.straat.toLowerCase().includes(term)) ||
                (adres.plaats && adres.plaats.toLowerCase().includes(term)) ||
                (adres.postcode && adres.postcode.toLowerCase().includes(term)) ||
                (adres.contactpersoon_naam && adres.contactpersoon_naam.toLowerCase().includes(term)) ||
                (adres.contactpersoon_email && adres.contactpersoon_email.toLowerCase().includes(term)) ||
                (adres.extra_info && adres.extra_info.toLowerCase().includes(term))
            );
        });
    }
    
    // Toon adressen in tabel
    function toonAdressen(adressen) {
        if (!adressenLijst) return;
        
        if (!adressen || adressen.length === 0) {
            if (huidigeZoekterm) {
                adressenLijst.innerHTML = `<p>Geen adressen gevonden voor "${escapeHtml(huidigeZoekterm)}".</p>`;
                if (searchResultCount) searchResultCount.textContent = `0 resultaten`;
            } else {
                adressenLijst.innerHTML = '<p>Geen adressen gevonden. Klik op "+ Nieuw adres" om er een toe te voegen.</p>';
                if (searchResultCount) searchResultCount.textContent = ``;
            }
            return;
        }
        
        // Toon aantal resultaten
        if (searchResultCount && huidigeZoekterm) {
            searchResultCount.textContent = `${adressen.length} resultaten gevonden`;
        } else if (searchResultCount) {
            searchResultCount.textContent = `${adressen.length} adressen totaal`;
        }
        
        // Tabel weergave
        let html = `
            <table>
                <thead>
                    <tr>
                        <th>Instelling</th>
                        <th>Adres</th>
                        <th>Postcode/Plaats</th>
                        <th>Contactpersoon</th>
                        <th>Extra info</th>
                        <th>Acties</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        adressen.forEach(adres => {
            // Contactpersoon weergave
            let contactpersoonHtml = '-';
            if (adres.contactpersoon_naam) {
                contactpersoonHtml = `<strong>${escapeHtml(adres.contactpersoon_naam)}</strong>`;
                if (adres.contactpersoon_email) {
                    contactpersoonHtml += `<br><a href="mailto:${escapeHtml(adres.contactpersoon_email)}" style="color:#2c7da0; font-size:0.85rem;">${escapeHtml(adres.contactpersoon_email)}</a>`;
                }
            } else if (adres.contactpersoon_email) {
                contactpersoonHtml = `<a href="mailto:${escapeHtml(adres.contactpersoon_email)}" style="color:#2c7da0;">${escapeHtml(adres.contactpersoon_email)}</a>`;
            }
            
            // Extra info verkort
            let extraInfoShort = '-';
            if (adres.extra_info) {
                extraInfoShort = escapeHtml(adres.extra_info.substring(0, 80));
                if (adres.extra_info.length > 80) extraInfoShort += '...';
            }
            
            // Highlight zoekterm in instelling naam
            let instellingNaam = escapeHtml(adres.instelling_naam);
            if (huidigeZoekterm) {
                const regex = new RegExp(`(${escapeRegex(huidigeZoekterm)})`, 'gi');
                instellingNaam = instellingNaam.replace(regex, '<mark>$1</mark>');
            }
            
            html += `
                <tr>
                    <td><strong>${instellingNaam}</strong></td>
                    <td>${escapeHtml(adres.straat)}</td>
                    <td>${escapeHtml(adres.postcode)}<br>${escapeHtml(adres.plaats)}</td>
                    <td class="contactpersoon-cell">${contactpersoonHtml}</td>
                    <td class="extra-info-cell">${extraInfoShort}</td>
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
    }
    
    // Escape regex speciale karakters
    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    // Laad adressen vanuit database
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
            
            alleAdressen = data || [];
            console.log(`${alleAdressen.length} adressen geladen`);
            
            // Pas filter toe op basis van huidige zoekterm
            const gefilterdeAdressen = filterAdressen(huidigeZoekterm);
            toonAdressen(gefilterdeAdressen);
            
        } catch (err) {
            console.error('Exception:', err);
            adressenLijst.innerHTML = `<p class="error">Fout: ${err.message}</p>`;
        }
    }
    
    // Zoek event handler
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            huidigeZoekterm = e.target.value;
            const gefilterdeAdressen = filterAdressen(huidigeZoekterm);
            toonAdressen(gefilterdeAdressen);
        });
    }
    
    // Clear zoekbalk
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                huidigeZoekterm = '';
                const gefilterdeAdressen = filterAdressen('');
                toonAdressen(gefilterdeAdressen);
                searchInput.focus();
            }
        });
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
            setValue('contactpersoon_naam', '');
            setValue('contactpersoon_email', '');
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
            setValue('contactpersoon_naam', data.contactpersoon_naam || '');
            setValue('contactpersoon_email', data.contactpersoon_email || '');
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
            const contactpersoon_naam = getValue('contactpersoon_naam');
            const contactpersoon_email = getValue('contactpersoon_email');
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
                contactpersoon_naam: contactpersoon_naam || null,
                contactpersoon_email: contactpersoon_email || null,
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