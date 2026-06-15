// ===== ADMIN FUNCTIES - GEOPTIMALISEERD =====

console.log('admin.js geladen');

document.addEventListener('DOMContentLoaded', async function() {
    
    if (!window.supabase) {
        console.error('Supabase niet beschikbaar!');
        return;
    }
    
    // Check admin status
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    // Snelle admin check
    const { data: userRollen, error: rolError } = await window.supabase
        .from('gebruikers_rollen')
        .select('rol')
        .eq('user_id', user.id)
        .maybeSingle();
    
    if (!userRollen || userRollen.rol !== 'admin') {
        alert('Je hebt geen toegang tot deze pagina. Alleen admins kunnen hier komen.');
        window.location.href = 'dashboard.html';
        return;
    }
    
    console.log('✅ Admin toegang verleend!');
    
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
    const aantalAdressenSpan = document.getElementById('aantalAdressen');
    const saveStartpuntBtn = document.getElementById('saveStartpuntBtn');
    const startpuntInstelling = document.getElementById('startpuntInstelling');
    
    let currentUserId = null;
    let alleGebruikers = [];
    let alleChauffeurs = [];
    let huidigeUserZoekterm = '';
    let huidigeChauffeurZoekterm = '';
    
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Snelle laad functie voor gebruikers (alleen gebruikers_rollen tabel)
    async function laadGebruikers() {
        if (!gebruikersLijst) return;
        
        gebruikersLijst.innerHTML = '<p>Bezig met laden...</p>';
        
        try {
            // Alleen de rollen tabel ophalen (bevat alle info die we nodig hebben)
            const { data: rollen, error: rollenError } = await window.supabase
                .from('gebruikers_rollen')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (rollenError) throw rollenError;
            
            if (!rollen || rollen.length === 0) {
                gebruikersLijst.innerHTML = '<p>Geen gebruikers gevonden.</p>';
                if (aantalGebruikersSpan) aantalGebruikersSpan.textContent = '0';
                return;
            }
            
            if (aantalGebruikersSpan) aantalGebruikersSpan.textContent = rollen.length;
            
            // Filteren op zoekterm
            let gefilterd = rollen;
            if (huidigeUserZoekterm) {
                const term = huidigeUserZoekterm.toLowerCase();
                gefilterd = rollen.filter(rol => 
                    (rol.gebruikersnaam && rol.gebruikersnaam.toLowerCase().includes(term)) ||
                    (rol.user_id && rol.user_id.toLowerCase().includes(term)) ||
                    (rol.rol && rol.rol.toLowerCase().includes(term))
                );
            }
            
            // Tabel direct bouwen (geen extra queries per rij)
            let html = `
                <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #f8f9fa;">
                            <th style="padding: 12px; text-align: left;">Gebruikersnaam</th>
                            <th style="padding: 12px; text-align: left;">User ID</th>
                            <th style="padding: 12px; text-align: left;">Rol</th>
                            <th style="padding: 12px; text-align: left;">Chauffeur</th>
                            <th style="padding: 12px; text-align: left;">Nummer</th>
                            <th style="padding: 12px; text-align: left;">Aangemaakt</th>
                            <th style="padding: 12px; text-align: left;">Acties</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            for (const rol of gefilterd) {
                html += `
                    <tr style="border-bottom: 1px solid #e9ecef;" data-userid="${rol.user_id}">
                        <td style="padding: 12px;"><strong>${escapeHtml(rol.gebruikersnaam || '-')}</strong></td>
                        <td style="padding: 12px; font-size: 0.8rem;">${rol.user_id.substring(0, 13)}...</td>
                        <td style="padding: 12px;">${rol.rol === 'admin' ? '👑 Admin' : '👤 Gebruiker'}</td>
                        <td style="padding: 12px;">${rol.is_chauffeur ? '✅ Ja' : '❌ Nee'}</td>
                        <td style="padding: 12px;">${rol.chauffeur_nummer || '-'}</td>
                        <td style="padding: 12px;">${new Date(rol.created_at).toLocaleDateString('nl-NL')}</td>
                        <td style="padding: 12px;">
                            <button class="btn btn-secondary edit-user-btn" data-userid="${rol.user_id}" style="margin-right: 5px;">✏️</button>
                            <button class="btn btn-danger delete-user-btn" data-userid="${rol.user_id}">🗑️</button>
                        </td>
                    </tr>
                `;
            }
            
            html += `
                    </tbody>
                </table>
                </div>
            `;
            
            gebruikersLijst.innerHTML = html;
            
            // Event listeners
            document.querySelectorAll('.edit-user-btn').forEach(btn => {
                btn.addEventListener('click', () => bewerkGebruiker(btn.dataset.userid));
            });
            document.querySelectorAll('.delete-user-btn').forEach(btn => {
                btn.addEventListener('click', () => verwijderGebruiker(btn.dataset.userid));
            });
            
        } catch (err) {
            console.error('Fout:', err);
            gebruikersLijst.innerHTML = `<p class="error">Fout: ${err.message}</p>`;
        }
    }
    
    // Laad chauffeurs (alleen actieve chauffeurs)
    async function laadChauffeurs() {
        if (!chauffeursLijst) return;
        
        chauffeursLijst.innerHTML = '<p>Bezig met laden...</p>';
        
        try {
            // Alleen chauffeurs ophalen uit gebruikers_rollen
            const { data: chauffeurs, error } = await window.supabase
                .from('gebruikers_rollen')
                .select('*')
                .eq('is_chauffeur', true)
                .order('chauffeur_nummer', { ascending: true });
            
            if (error) throw error;
            
            if (!chauffeurs || chauffeurs.length === 0) {
                chauffeursLijst.innerHTML = '<p>Geen chauffeurs gevonden.</p>';
                return;
            }
            
            let html = `
                <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #f8f9fa;">
                            <th style="padding: 12px; text-align: left;">Nummer</th>
                            <th style="padding: 12px; text-align: left;">Gebruikersnaam</th>
                            <th style="padding: 12px; text-align: left;">Telefoon</th>
                            <th style="padding: 12px; text-align: left;">Acties</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            for (const chauffeur of chauffeurs) {
                html += `
                    <tr style="border-bottom: 1px solid #e9ecef;">
                        <td style="padding: 12px;">${escapeHtml(chauffeur.chauffeur_nummer || '-')}</td>
                        <td style="padding: 12px;"><strong>${escapeHtml(chauffeur.gebruikersnaam || '-')}</strong></td>
                        <td style="padding: 12px;">${escapeHtml(chauffeur.chauffeur_telefoon || '-')}</td>
                        <td style="padding: 12px;">
                            <button class="btn btn-secondary edit-chauffeur-btn" data-userid="${chauffeur.user_id}">✏️ Bewerken</button>
                        </td>
                    </tr>
                `;
            }
            
            html += `
                    </tbody>
                </table>
                </div>
            `;
            
            chauffeursLijst.innerHTML = html;
            
            document.querySelectorAll('.edit-chauffeur-btn').forEach(btn => {
                btn.addEventListener('click', () => bewerkGebruiker(btn.dataset.userid));
            });
            
        } catch (err) {
            console.error('Fout:', err);
            chauffeursLijst.innerHTML = `<p class="error">Fout: ${err.message}</p>`;
        }
    }
    
    // Rest van de functies (bewerkGebruiker, verwijderGebruiker, etc.) blijven hetzelfde
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
            document.getElementById('userEmail').value = '';
            document.getElementById('userEmail').disabled = true;
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
    
    async function verwijderGebruiker(userId) {
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
            alert('Fout bij verwijderen: ' + err.message);
        }
    }
    
    if (addUserBtn) {
        addUserBtn.addEventListener('click', () => {
            currentUserId = null;
            userPopupTitle.textContent = 'Nieuwe gebruiker';
            document.getElementById('userGebruikersnaam').value = '';
            document.getElementById('userEmail').value = '';
            document.getElementById('userEmail').disabled = false;
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
    
    if (userIsChauffeur) {
        userIsChauffeur.addEventListener('change', (e) => {
            chauffeurVelden.style.display = e.target.value === 'true' ? 'block' : 'none';
        });
    }
    
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
                    if (!email || !password) {
                        alert('E-mail en wachtwoord zijn verplicht voor nieuwe gebruikers');
                        return;
                    }
                    
                    const { data: authData, error: authError } = await window.supabase.auth.signUp({
                        email: email,
                        password: password
                    });
                    
                    if (authError) throw authError;
                    
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
    
    if (closeUserPopup) {
        closeUserPopup.addEventListener('click', () => {
            userPopup.style.display = 'none';
        });
    }
    
    if (saveStartpuntBtn) {
        saveStartpuntBtn.addEventListener('click', () => {
            const startpunt = startpuntInstelling.value;
            localStorage.setItem('abbott_startpunt', JSON.stringify({ adres: startpunt }));
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
            }
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === userPopup) {
            userPopup.style.display = 'none';
        }
    });
    
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
            searchUserInput.focus();
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
            searchChauffeurInput.focus();
        });
    }
    
    // Laad initiële data
    laadGebruikers();
    
    // Laad opgeslagen startpunt
    const opgeslagenStartpunt = localStorage.getItem('abbott_startpunt');
    if (opgeslagenStartpunt && startpuntInstelling) {
        try {
            const parsed = JSON.parse(opgeslagenStartpunt);
            startpuntInstelling.value = parsed.adres;
        } catch(e) {}
    }
    
});