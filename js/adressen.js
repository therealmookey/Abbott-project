// ===== ADRESSEN FUNCTIES MET ROUTE PLANNER (PAPIEREN ROUTE) =====

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
    const routeBtn = document.getElementById('routeBtn');
    const routePopup = document.getElementById('routePopup');
    const closeRoutePopupBtn = document.getElementById('closeRoutePopupBtn');
    const printRouteBtn = document.getElementById('printRouteBtn');
    const routeLocationsList = document.getElementById('routeLocationsList');
    const startpuntWeergave = document.getElementById('startpuntWeergave');
    const aantalStopsSpan = document.getElementById('aantalStops');
    const routeDatumSpan = document.getElementById('routeDatum');
    
    let currentAddressId = null;
    let alleAdressen = [];
    let huidigeZoekterm = '';
    let geselecteerdeAdressen = [];
    
    // Helper functies
    function getValue(id) {
        const el = document.getElementById(id);
        return el ? el.value : '';
    }
    
    function setValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    }
    
    // Coördinaten ophalen via Nominatim (OpenStreetMap) - gratis!
    async function haalCoordinatenOp(adres) {
        const zoekTerm = `${adres.straat}, ${adres.postcode} ${adres.plaats}, België`;
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(zoekTerm)}&limit=1`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Abbott-Route-Planner/1.0'
                }
            });
            const data = await response.json();
            if (data && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lon: parseFloat(data[0].lon)
                };
            }
        } catch (error) {
            console.error('Fout bij ophalen coördinaten:', error);
        }
        return null;
    }
    
    // Afstand berekenen tussen twee punten (Haversine formule - vogelvlucht in km)
    function berekenAfstand(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius aarde in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    // Optimaliseer route op basis van vogelvlucht afstand (dichtstbijzijnde eerst)
    async function optimaliseerRoute(adressen, startpunt = null) {
        if (!adressen || adressen.length === 0) return [];
        
        // Haal coördinaten op voor alle adressen
        const adressenMetCoords = [];
        for (const adres of adressen) {
            const coords = await haalCoordinatenOp(adres);
            if (coords) {
                adressenMetCoords.push({
                    ...adres,
                    lat: coords.lat,
                    lon: coords.lon
                });
            } else {
                adressenMetCoords.push(adres);
            }
        }
        
        // Filter adressen zonder coördinaten (die komen achteraan)
        const metCoords = adressenMetCoords.filter(a => a.lat && a.lon);
        const zonderCoords = adressenMetCoords.filter(a => !a.lat || !a.lon);
        
        if (metCoords.length === 0) return adressen;
        
        // Bepaal startpunt (standaard: eerste adres of opgegeven startpunt)
        let huidigeLat, huidigeLon;
        if (startpunt && startpunt.lat && startpunt.lon) {
            huidigeLat = startpunt.lat;
            huidigeLon = startpunt.lon;
        } else if (metCoords[0].lat && metCoords[0].lon) {
            huidigeLat = metCoords[0].lat;
            huidigeLon = metCoords[0].lon;
        } else {
            return adressen;
        }
        
        // Greedy algoritme: kies steeds het dichtstbijzijnde volgende punt
        const ongeordend = [...metCoords];
        const geordend = [];
        
        while (ongeordend.length > 0) {
            let dichtstbijIndex = 0;
            let kortsteAfstand = Infinity;
            
            for (let i = 0; i < ongeordend.length; i++) {
                if (ongeordend[i].lat && ongeordend[i].lon) {
                    const afstand = berekenAfstand(huidigeLat, huidigeLon, ongeordend[i].lat, ongeordend[i].lon);
                    if (afstand < kortsteAfstand) {
                        kortsteAfstand = afstand;
                        dichtstbijIndex = i;
                    }
                }
            }
            
            const volgende = ongeordend[dichtstbijIndex];
            geordend.push(volgende);
            huidigeLat = volgende.lat;
            huidigeLon = volgende.lon;
            ongeordend.splice(dichtstbijIndex, 1);
        }
        
        // Adressen zonder coördinaten achteraan toevoegen
        return [...geordend, ...zonderCoords];
    }
    
    // Tabel weergeven met selectievakjes
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
        
        if (searchResultCount && huidigeZoekterm) {
            searchResultCount.textContent = `${adressen.length} resultaten gevonden`;
        } else if (searchResultCount) {
            searchResultCount.textContent = `${adressen.length} adressen totaal`;
        }
        
        let html = `
            <table>
                <thead>
                    <tr>
                        <th style="width: 40px;"><input type="checkbox" id="selecteerAlleCheckbox"></th>
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
            const isSelected = geselecteerdeAdressen.some(a => a.id === adres.id);
            
            let contactpersoonHtml = '-';
            if (adres.contactpersoon_naam) {
                contactpersoonHtml = `<strong>${escapeHtml(adres.contactpersoon_naam)}</strong>`;
                if (adres.contactpersoon_email) {
                    contactpersoonHtml += `<br><a href="mailto:${escapeHtml(adres.contactpersoon_email)}">${escapeHtml(adres.contactpersoon_email)}</a>`;
                }
            } else if (adres.contactpersoon_email) {
                contactpersoonHtml = `<a href="mailto:${escapeHtml(adres.contactpersoon_email)}">${escapeHtml(adres.contactpersoon_email)}</a>`;
            }
            
            let extraInfoShort = '-';
            if (adres.extra_info) {
                extraInfoShort = escapeHtml(adres.extra_info.substring(0, 60));
                if (adres.extra_info.length > 60) extraInfoShort += '...';
            }
            
            html += `
                <tr data-id="${adres.id}">
                    <td style="text-align: center;"><input type="checkbox" class="adres-checkbox" data-id="${adres.id}" ${isSelected ? 'checked' : ''}></td>
                    <td><strong>${escapeHtml(adres.instelling_naam)}</strong></td>
                    <td>${escapeHtml(adres.straat)}</td>
                    <td>${escapeHtml(adres.postcode)}<br>${escapeHtml(adres.plaats)}</td>
                    <td class="contactpersoon-cell">${contactpersoonHtml}</td>
                    <td class="extra-info-cell">${extraInfoShort}</td>
                    <td class="adres-buttons">
                        <button class="btn btn-secondary edit-btn" data-id="${adres.id}">✏️</button>
                        <button class="btn btn-danger delete-btn" data-id="${adres.id}">🗑️</button>
                    </td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        adressenLijst.innerHTML = html;
        
        // Selectie event listeners
        const selecteerAlleCheckbox = document.getElementById('selecteerAlleCheckbox');
        if (selecteerAlleCheckbox) {
            selecteerAlleCheckbox.addEventListener('change', (e) => {
                const checkboxes = document.querySelectorAll('.adres-checkbox');
                checkboxes.forEach(cb => {
                    cb.checked = e.target.checked;
                    const id = parseInt(cb.dataset.id);
                    if (e.target.checked) {
                        const adres = alleAdressen.find(a => a.id === id);
                        if (adres && !geselecteerdeAdressen.some(a => a.id === id)) {
                            geselecteerdeAdressen.push(adres);
                        }
                    } else {
                        geselecteerdeAdressen = geselecteerdeAdressen.filter(a => a.id !== id);
                    }
                });
                updateRouteButton();
            });
        }
        
        // Individuele checkboxes
        document.querySelectorAll('.adres-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const id = parseInt(e.target.dataset.id);
                const adres = alleAdressen.find(a => a.id === id);
                if (e.target.checked) {
                    if (adres && !geselecteerdeAdressen.some(a => a.id === id)) {
                        geselecteerdeAdressen.push(adres);
                    }
                } else {
                    geselecteerdeAdressen = geselecteerdeAdressen.filter(a => a.id !== id);
                }
                updateRouteButton();
                
                // Update selecteer alle checkbox
                const selecteerAlle = document.getElementById('selecteerAlleCheckbox');
                if (selecteerAlle) {
                    const alleCheckboxes = document.querySelectorAll('.adres-checkbox');
                    const alleGeselecteerd = Array.from(alleCheckboxes).every(cb => cb.checked);
                    selecteerAlle.checked = alleGeselecteerd;
                }
            });
        });
        
        // Edit en delete buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => bewerkAdres(btn.dataset.id));
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => verwijderAdres(btn.dataset.id));
        });
    }
    
    function updateRouteButton() {
        if (routeBtn) {
            routeBtn.textContent = `🗺️ Route genereren (${geselecteerdeAdressen.length} geselecteerd)`;
        }
    }
    
    // Route popup tonen met geoptimaliseerde volgorde
    async function toonRoutePopup() {
        if (geselecteerdeAdressen.length === 0) {
            alert('Selecteer eerst minimaal één adres voor de route.');
            return;
        }
        
        // Toon datum
        if (routeDatumSpan) {
            const vandaag = new Date();
            routeDatumSpan.textContent = vandaag.toLocaleDateString('nl-NL');
        }
        
        // Optimaliseer route
        routeLocationsList.innerHTML = '<p>Bezig met optimaliseren...</p>';
        routePopup.style.display = 'flex';
        
        const geoptimaliseerd = await optimaliseerRoute([...geselecteerdeAdressen]);
        
        // Toon de route
        let html = '<ol class="route-ol">';
        geoptimaliseerd.forEach((adres, index) => {
            html += `
                <li class="route-item">
                    <strong>${index + 1}. ${escapeHtml(adres.instelling_naam)}</strong><br>
                    📍 ${escapeHtml(adres.straat)}<br>
                    📮 ${escapeHtml(adres.postcode)} ${escapeHtml(adres.plaats)}<br>
                    ${adres.contactpersoon_naam ? `👤 ${escapeHtml(adres.contactpersoon_naam)}<br>` : ''}
                    ${adres.contactpersoon_email ? `📧 ${escapeHtml(adres.contactpersoon_email)}<br>` : ''}
                    ${adres.telefoon ? `📞 ${escapeHtml(adres.telefoon)}<br>` : ''}
                    ${adres.extra_info ? `<div class="route-extra-info">📝 ${escapeHtml(adres.extra_info)}</div>` : ''}
                </li>
            `;
        });
        html += '</ol>';
        
        routeLocationsList.innerHTML = html;
        if (aantalStopsSpan) aantalStopsSpan.textContent = geoptimaliseerd.length;
    }
    
    // Print functie
    if (printRouteBtn) {
        printRouteBtn.addEventListener('click', () => {
            window.print();
        });
    }
    
    // Route popup openen
    if (routeBtn) {
        routeBtn.addEventListener('click', toonRoutePopup);
    }
    
    // Route popup sluiten
    if (closeRoutePopupBtn) {
        closeRoutePopupBtn.addEventListener('click', () => {
            routePopup.style.display = 'none';
        });
    }
    
    // Filter adressen
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
                (adres.contactpersoon_email && adres.contactpersoon_email.toLowerCase().includes(term))
            );
        });
    }
    
    // Laad adressen
    async function laadAdressen() {
        if (!adressenLijst) return;
        
        adressenLijst.innerHTML = '<p>Bezig met laden...</p>';
        
        try {
            const { data, error } = await window.supabase
                .from('adressen')
                .select('*')
                .order('instelling_naam');
            
            if (error) {
                adressenLijst.innerHTML = `<p class="error">Fout: ${error.message}</p>`;
                return;
            }
            
            alleAdressen = data || [];
            const gefilterdeAdressen = filterAdressen(huidigeZoekterm);
            toonAdressen(gefilterdeAdressen);
            
        } catch (err) {
            adressenLijst.innerHTML = `<p class="error">Fout: ${err.message}</p>`;
        }
    }
    
    // Zoek functie
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            huidigeZoekterm = e.target.value;
            const gefilterdeAdressen = filterAdressen(huidigeZoekterm);
            toonAdressen(gefilterdeAdressen);
        });
    }
    
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                huidigeZoekterm = '';
                toonAdressen(alleAdressen);
                searchInput.focus();
            }
        });
    }
    
    // Adres toevoegen bewerken
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
                alert('Fout: ' + error.message);
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
            const adresData = {
                instelling_naam: getValue('instellingNaam'),
                straat: getValue('straat'),
                postcode: getValue('postcode'),
                plaats: getValue('plaats'),
                telefoon: getValue('telefoon') || null,
                contactpersoon_naam: getValue('contactpersoon_naam') || null,
                contactpersoon_email: getValue('contactpersoon_email') || null,
                extra_info: getValue('extra_info') || null
            };
            
            if (!adresData.instelling_naam || !adresData.straat || !adresData.postcode || !adresData.plaats) {
                alert('Vul alle verplichte velden in');
                return;
            }
            
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
                    alert('Fout: ' + result.error.message);
                } else {
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
                alert('Fout: ' + error.message);
            } else {
                geselecteerdeAdressen = geselecteerdeAdressen.filter(a => a.id !== id);
                updateRouteButton();
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
        if (e.target === routePopup) {
            routePopup.style.display = 'none';
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