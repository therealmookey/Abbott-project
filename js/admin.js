// ===== ADMIN FUNCTIES - BLIJFT INGELOGD =====

console.log('admin.js geladen');

document.addEventListener('DOMContentLoaded', async function() {
    
    if (!window.supabase) {
        console.error('Supabase niet beschikbaar!');
        return;
    }
    
    // Voorkom dat form submits de pagina herladen
    document.addEventListener('submit', function(e) {
        e.preventDefault();
    });
    
    // Hulpfunctie voor berichten
    function toonFout(bericht) {
        console.error(bericht);
        const container = document.querySelector('.container');
        if (container) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'message error';
            errorDiv.textContent = bericht;
            errorDiv.style.cssText = 'background:#f8d7da;color:#721c24;padding:15px;margin:20px;border-radius:8px;';
            container.prepend(errorDiv);
            setTimeout(() => errorDiv.remove(), 5000);
        }
    }
    
    // Huidige gebruiker ophalen
    const { data: { user }, error: userError } = await window.supabase.auth.getUser();
    
    if (userError) {
        console.error('Fout bij ophalen gebruiker:', userError);
        toonFout('Kon gebruiker niet laden. Ben je ingelogd?');
        setTimeout(() => window.location.href = 'index.html', 2000);
        return;
    }
    
    if (!user) {
        console.log('Geen gebruiker ingelogd');
        toonFout('Je moet ingelogd zijn om deze pagina te bekijken.');
        setTimeout(() => window.location.href = 'index.html', 2000);
        return;
    }
    
    console.log('Ingelogd als:', user.email);
    
    // Admin check - kijk in gebruikers_rollen tabel
    let isAdmin = false;
    
    try {
        const { data: adminData, error: adminError } = await window.supabase
            .from('gebruikers_rollen')
            .select('rol')
            .eq('user_id', user.id)
            .maybeSingle();
        
        if (adminError) {
            console.error('Fout bij admin check:', adminError);
        }
        
        isAdmin = (adminData && adminData.rol === 'admin');
        
        // Fallback voor vaste admin
        if (!isAdmin && user.id === 'fixed_admin_001') {
            isAdmin = true;
        }
        
    } catch (err) {
        console.error('Admin check error:', err);
    }
    
    if (!isAdmin) {
        console.log('Geen admin rechten voor:', user.email);
        toonFout('Je hebt geen toegang tot deze pagina. Alleen admins kunnen hier komen.');
        setTimeout(() => window.location.href = 'dashboard.html', 2000);
        return;
    }
    
    console.log('✅ Admin toegang verleend voor:', user.email);
    
    // =========== ADMIN FUNCTIONALITEIT ===========
    
    // DOM elementen
    const addUserBtn = document.getElementById('addUserBtn');
    const userPopup = document.getElementById('userPopup');
    const closeUserPopup = document.getElementById('closeUserPopup');
    const saveUserBtn = document.getElementById('saveUserBtn');
    const userPopupTitle = document.getElementById('userPopupTitle');
    const userIsChauffeur = document.getElementById('userIsChauffeur');
    const chauffeurVelden = document.getElementById('chauffeurVelden');
    const gebruikersLijst = document.getElementById('gebruikersLijst');
    const chauffeursLijst = document.getElementById('chauffeursLijst');
    const searchUserInput = document.getElementById('searchUserInput');
    const clearUserSearchBtn = document.getElementById('clearUserSearchBtn');
    const searchChauffeurInput = document.getElementById('searchChauffeurInput');
    const clearChauffeurSearchBtn = document.getElementById('clearChauffeurSearchBtn');
    const aantalGebruikersSpan = document.getElementById('aantalGebruikers');
    const aantalChauffeursSpan = document.getElementById('aantalChauffeurs');
    const aantalAdressenSpan = document.getElementById('aantalAdressen');
    const saveStartpuntBtn = document.getElementById('saveStartpuntBtn');
    const startpuntInstelling = document.getElementById('startpuntInstelling');
    
    let currentUserId = null;
    let huidigeUserZoekterm = '';
    let huidigeChauffeurZoekterm = '';
    
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Laad alle gebruikers
    async function laadGebruikers() {
        if (!gebruikersLijst) return;
        gebruikersLijst.innerHTML = '<p>Bezig met laden...</p>';
        
        try {
            const { data, error } = await window.supabase
                .from('gebruikers_rollen')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            if (aantalGebruikersSpan) aantalGebruikersSpan.textContent = data?.length || 0;
            
            let gefilterd = data || [];
            if (huidigeUserZoekterm) {
                const term = huidigeUserZoekterm.toLowerCase();
                gefilterd = gefilterd.filter(g => 
                    (g.gebruikersnaam && g.gebruikersnaam.toLowerCase().includes(term))
                );
            }
            
            if (gefilterd.length === 0) {
                gebruikersLijst.innerHTML = '<p>Geen gebruikers gevonden.</p>';
                return;
            }
            
            let html = `<div style="overflow-x: auto;"><table style="width:100%;border-collapse:collapse;">
                <thead><tr style="background:#f8f9fa;">
                    <th style="padding:12px;text-align:left;">Gebruikersnaam</th>
                    <th style="padding:12px;text-align:left;">Rol</th>
                    <th style="padding:12px;text-align:left;">Chauffeur</th>
                    <th style="padding:12px;text-align:left;">Nummer</th>
                    <th style="padding:12px;text-align:left;">WhatsApp</th>
                    <th style="padding:12px;text-align:left;">Aangemaakt</th>
                    <th style="padding:12px;text-align:left;">Acties</th>
                </tr></thead><tbody>`;
            
            for (const g of gefilterd) {
                html += `<tr style="border-bottom:1px solid #e9ecef;">
                    <td style="padding:12px;"><strong>${escapeHtml(g.gebruikersnaam || '-')}</strong></td>
                    <td style="padding:12px;">${g.rol === 'admin' ? '👑 Admin' : '👤 Gebruiker'}</td>
                    <td style="padding:12px;">${g.is_chauffeur ? '✅ Ja' : '❌ Nee'}</td>
                    <td style="padding:12px;">${escapeHtml(g.chauffeur_nummer || '-')}</td>
                    <td style="padding:12px;">${escapeHtml(g.chauffeur_telefoon || '-')}</td>
                    <td style="padding:12px;">${new Date(g.created_at).toLocaleDateString('nl-NL')}</td>
                    <td style="padding:12px;">
                        <button class="btn btn-secondary edit-btn" data-userid="${g.user_id}" style="margin-right:5px;">✏️</button>
                        <button class="btn btn-danger delete-btn" data-userid="${g.user_id}">🗑️</button>
                    </td>
                </tr>`;
            }
            
            html += `</tbody></table></div>`;
            gebruikersLijst.innerHTML = html;
            
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', () => bewerkGebruiker(btn.dataset.userid));
            });
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', () => verwijderGebruiker(btn.dataset.userid));
            });
            
        } catch (err) {
            console.error('Fout:', err);
            gebruikersLijst.innerHTML = `<p class="error">Fout: ${err.message}</p>`;
        }
    }
    
    // Laad alleen chauffeurs
    async function laadChauffeurs() {
        if (!chauffeursLijst) return;
        chauffeursLijst.innerHTML = '<p>Bezig met laden...</p>';
        
        try {
            const { data, error } = await window.supabase
                .from('gebruikers_rollen')
                .select('*')
                .eq('is_chauffeur', true)
                .order('chauffeur_nummer', { ascending: true });
            
            if (error) throw error;
            
            if (aantalChauffeursSpan) aantalChauffeursSpan.textContent = data?.length || 0;
            
            if (!data || data.length === 0) {
                chauffeursLijst.innerHTML = '<p>Geen chauffeurs gevonden. Vink "Chauffeur" aan bij een gebruiker.</p>';
                return;
            }
            
            let html = `<div style="overflow-x: auto;"><table style="width:100%;border-collapse:collapse;">
                <thead><tr style="background:#f8f9fa;">
                    <th style="padding:12px;text-align:left;">Nummer</th>
                    <th style="padding:12px;text-align:left;">Gebruikersnaam</th>
                    <th style="padding:12px;text-align:left;">WhatsApp</th>
                    <th style="padding:12px;text-align:left;">Acties</th>
                </tr></thead><tbody>`;
            
            for (const c of data) {
                html += `<tr style="border-bottom:1px solid #e9ecef;">
                    <td style="padding:12px;"><strong>${escapeHtml(c.chauffeur_nummer || '-')}</strong></td>
                    <td style="padding:12px;">${escapeHtml(c.gebruikersnaam || '-')}</td>
                    <td style="padding:12px;">${escapeHtml(c.chauffeur_telefoon || '-')}</td>
                    <td style="padding:12px;">
                        <button class="btn btn-secondary edit-chauffeur-btn" data-userid="${c.user_id}">✏️ Bewerken</button>
                    </td>
                </tr>`;
            }
            
            html += `</tbody></table></div>`;
            chauffeursLijst.innerHTML = html;
            
            document.querySelectorAll('.edit-chauffeur-btn').forEach(btn => {
                btn.addEventListener('click', () => bewerkGebruiker(btn.dataset.userid));
            });
            
        } catch (err) {
            console.error('Fout:', err);
            chauffeursLijst.innerHTML = `<p class="error">Fout: ${err.message}</p>`;
        }
    }
    
    // Laad statistieken
    async function laadStatistieken() {
        try {
            const { count: adresCount } = await window.supabase
                .from('adressen')
                .select('*', { count: 'exact', head: true });
            if (aantalAdressenSpan) aantalAdressenSpan.textContent = adresCount || 0;
        } catch(e) { console.error(e); }
    }
    
    // Bewerk gebruiker
    async function bewerkGebruiker(userId) {
        currentUserId = userId;
        userPopupTitle.textContent = 'Gebruiker bewerken';
        
        try {
            const { data, error } = await window.supabase
                .from('gebruikers_rollen')
                .select('*')
                .eq('user_id', userId)
                .single();
            
            if (error) throw error;
            
            document.getElementById('userGebruikersnaam').value = data.gebruikersnaam || '';
            document.getElementById('userEmail').disabled = true;
            document.getElementById('userEmail').value = '';
            document.getElementById('userEmail').placeholder = 'E-mail niet bewerkbaar';
            document.getElementById('userPassword').value = '';
            document.getElementById('userPassword').required = false;
            document.getElementById('userRol').value = data.rol;
            document.getElementById('userIsChauffeur').value = data.is_chauffeur ? 'true' : 'false';
            document.getElementById('chauffeurNummer').value = data.chauffeur_nummer || '';
            document.getElementById('chauffeurTelefoon').value = data.chauffeur_telefoon || '';
            
            chauffeurVelden.style.display = data.is_chauffeur ? 'block' : 'none';
            userPopup.style.display = 'flex';
            
        } catch (err) {
            alert('Fout bij laden: ' + err.message);
        }
    }
    
    // Verwijder gebruiker
    async function verwijderGebruiker(userId) {
        if (userId === 'fixed_admin_001') {
            alert('Je kunt de vaste admin niet verwijderen!');
            return;
        }
        if (userId === user.id) {
            alert('Je kunt jezelf niet verwijderen!');
            return;
        }
        if (!confirm('Weet je zeker dat je deze gebruiker wilt verwijderen?')) return;
        
        try {
            const { error } = await window.supabase
                .from('gebruikers_rollen')
                .delete()
                .eq('user_id', userId);
            
            if (error) throw error;
            alert('Gebruiker verwijderd');
            laadGebruikers();
            laadChauffeurs();
        } catch (err) {
            alert('Fout: ' + err.message);
        }
    }
    
    // Nieuwe gebruiker knop
    if (addUserBtn) {
        addUserBtn.addEventListener('click', () => {
            currentUserId = null;
            userPopupTitle.textContent = 'Nieuwe gebruiker';
            document.getElementById('userGebruikersnaam').value = '';
            document.getElementById('userEmail').disabled = false;
            document.getElementById('userEmail').value = '';
            document.getElementById('userPassword').value = '';
            document.getElementById('userPassword').required = true;
            document.getElementById('userRol').value = 'gebruiker';
            document.getElementById('userIsChauffeur').value = 'false';
            document.getElementById('chauffeurNummer').value = '';
            document.getElementById('chauffeurTelefoon').value = '';
            chauffeurVelden.style.display = 'none';
            userPopup.style.display = 'flex';
        });
    }
    
    // Toon/verberg chauffeur velden
    if (userIsChauffeur) {
        userIsChauffeur.addEventListener('change', (e) => {
            chauffeurVelden.style.display = e.target.value === 'true' ? 'block' : 'none';
        });
    }
    
    // Opslaan gebruiker (met sessie behoud)
    if (saveUserBtn) {
        saveUserBtn.addEventListener('click', async () => {
            const gebruikersnaam = document.getElementById('userGebruikersnaam').value;
            const email = document.getElementById('userEmail').value;
            const password = document.getElementById('userPassword').value;
            const rol = document.getElementById('userRol').value;
            const isChauffeur = document.getElementById('userIsChauffeur').value === 'true';
            const chauffeurNummer = document.getElementById('chauffeurNummer').value;
            const chauffeurTelefoon = document.getElementById('chauffeurTelefoon').value;
            
            if (!gebruikersnaam) {
                alert('Gebruikersnaam is verplicht');
                return;
            }
            
            try {
                if (currentUserId) {
                    // Update bestaande gebruiker
                    const { error } = await window.supabase
                        .from('gebruikers_rollen')
                        .update({
                            gebruikersnaam: gebruikersnaam,
                            rol: rol,
                            is_chauffeur: isChauffeur,
                            chauffeur_nummer: chauffeurNummer || null,
                            chauffeur_telefoon: chauffeurTelefoon || null
                        })
                        .eq('user_id', currentUserId);
                    
                    if (error) throw error;
                    alert('Gebruiker bijgewerkt');
                    
                } else {
                    // Nieuwe gebruiker - bewaar huidige sessie
                    if (!email || !password || password.length < 6) {
                        alert('E-mail en wachtwoord (min. 6 tekens) zijn verplicht');
                        return;
                    }
                    
                    // Controleer of gebruikersnaam uniek is
                    const { data: bestaand } = await window.supabase
                        .from('gebruikers_rollen')
                        .select('gebruikersnaam')
                        .eq('gebruikersnaam', gebruikersnaam);
                    
                    if (bestaand && bestaand.length > 0) {
                        alert('Deze gebruikersnaam bestaat al');
                        return;
                    }
                    
                    // Bewaar de huidige sessie voordat we een nieuwe gebruiker maken
                    const { data: { session: huidigeSessie } } = await window.supabase.auth.getSession();
                    
                    // Maak nieuwe account aan
                    const { data: authData, error: authError } = await window.supabase.auth.signUp({
                        email: email,
                        password: password
                    });
                    
                    if (authError) throw authError;
                    
                    // Herstel de oude sessie (blijf ingelogd als admin)
                    if (huidigeSessie) {
                        await window.supabase.auth.setSession(huidigeSessie);
                    }
                    
                    if (authData.user) {
                        const { error: rolError } = await window.supabase
                            .from('gebruikers_rollen')
                            .insert([{
                                user_id: authData.user.id,
                                gebruikersnaam: gebruikersnaam,
                                rol: rol,
                                is_chauffeur: isChauffeur,
                                chauffeur_nummer: chauffeurNummer || null,
                                chauffeur_telefoon: chauffeurTelefoon || null
                            }]);
                        
                        if (rolError) throw rolError;
                        alert(`Gebruiker ${gebruikersnaam} aangemaakt!`);
                    }
                }
                
                userPopup.style.display = 'none';
                laadGebruikers();
                laadChauffeurs();
                
            } catch (err) {
                alert('Fout: ' + err.message);
            }
        });
    }
    
    // Sluit popup
    if (closeUserPopup) {
        closeUserPopup.addEventListener('click', () => {
            userPopup.style.display = 'none';
        });
    }
    
    // Startpunt opslaan
    if (saveStartpuntBtn) {
        saveStartpuntBtn.addEventListener('click', () => {
            localStorage.setItem('abbott_startpunt', JSON.stringify({ adres: startpuntInstelling.value }));
            alert('Startpunt opgeslagen!');
        });
    }
    
    // Tab functionaliteit
    const tabButtons = document.querySelectorAll('.admin-tabs .tab-btn');
    const tabs = document.querySelectorAll('.admin-tab');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            tabs.forEach(tab => tab.classList.remove('active'));
            
            if (tabId === 'gebruikers') {
                document.getElementById('tabGebruikers').classList.add('active');
                laadGebruikers();
            } else if (tabId === 'chauffeurs') {
                document.getElementById('tabChauffeurs').classList.add('active');
                laadChauffeurs();
            } else if (tabId === 'instellingen') {
                document.getElementById('tabInstellingen').classList.add('active');
                laadStatistieken();
            }
        });
    });
    
    // Zoek functies
    if (searchUserInput) {
        searchUserInput.addEventListener('input', (e) => {
            huidigeUserZoekterm = e.target.value;
            laadGebruikers();
        });
    }
    
    if (clearUserSearchBtn) {
        clearUserSearchBtn.addEventListener('click', () => {
            searchUserInput.value = '';
            huidigeUserZoekterm = '';
            laadGebruikers();
        });
    }
    
    if (searchChauffeurInput) {
        searchChauffeurInput.addEventListener('input', (e) => {
            huidigeChauffeurZoekterm = e.target.value;
            laadChauffeurs();
        });
    }
    
    if (clearChauffeurSearchBtn) {
        clearChauffeurSearchBtn.addEventListener('click', () => {
            searchChauffeurInput.value = '';
            huidigeChauffeurZoekterm = '';
            laadChauffeurs();
        });
    }
    
    // Klik buiten popup sluiten
    window.addEventListener('click', (e) => {
        if (e.target === userPopup) {
            userPopup.style.display = 'none';
        }
    });
    
    // Start
    laadGebruikers();
    laadStatistieken();
    
    const savedStartpunt = localStorage.getItem('abbott_startpunt');
    if (savedStartpunt && startpuntInstelling) {
        try {
            const parsed = JSON.parse(savedStartpunt);
            startpuntInstelling.value = parsed.adres;
        } catch(e) {}
    }
    
});