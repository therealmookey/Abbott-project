// ===== ADMIN FUNCTIES =====

console.log('admin.js geladen');

document.addEventListener('DOMContentLoaded', async function() {
    
    if (!window.supabase) {
        console.error('Supabase niet beschikbaar!');
        return;
    }
    
    // Controleer of de ingelogde gebruiker een admin is
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    console.log('Ingelogde user ID:', user.id);
    
    // Check admin status - de query geeft een ARRAY terug
    const { data: userRollen, error: rolError } = await window.supabase
        .from('gebruikers_rollen')
        .select('rol')
        .eq('user_id', user.id);
    
    console.log('User rollen (array):', userRollen);
    
    // Check of de gebruiker admin is (kijk in de array)
    let isAdmin = false;
    if (userRollen && userRollen.length > 0) {
        isAdmin = (userRollen[0].rol === 'admin');
    }
    
    console.log('Is admin?', isAdmin);
    
    if (!isAdmin) {
        alert('Je hebt geen toegang tot deze pagina. Alleen admins kunnen hier komen.');
        window.location.href = 'dashboard.html';
        return;
    }
    
    console.log('✅ Admin toegang verleend!');
    
    // =========== DE REST VAN HET ADMIN PANEL ===========
    
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
    const aantalRittenSpan = document.getElementById('aantalRitten');
    const saveStartpuntBtn = document.getElementById('saveStartpuntBtn');
    const startpuntInstelling = document.getElementById('startpuntInstelling');
    
    let currentUserId = null;
    let alleGebruikers = [];
    let alleChauffeurs = [];
    let huidigeUserZoekterm = '';
    let huidigeChauffeurZoekterm = '';
    
    // Haal alle gebruikers op
    async function laadGebruikers() {
        if (!gebruikersLijst) return;
        
        gebruikersLijst.innerHTML = '<p>Bezig met laden...</p>';
        
        try {
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
            
            let html = `
                <table>
                    <thead>
                        <tr>
                            <th>User ID</th>
                            <th>Rol</th>
                            <th>Chauffeur</th>
                            <th>Chauffeursnummer</th>
                            <th>Telefoon</th>
                            <th>Aangemaakt</th>
                            <th>Acties</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            for (const rol of rollen) {
                html += `
                    <tr data-userid="${rol.user_id}">
                        <td>${rol.user_id.substring(0, 8)}...</td>
                        <td>${rol.rol === 'admin' ? '👑 Admin' : '👤 Gebruiker'}</td>
                        <td>${rol.is_chauffeur ? '✅ Ja' : '❌ Nee'}</td>
                        <td>${rol.chauffeur_nummer || '-'}</td>
                        <td>${rol.chauffeur_telefoon || '-'}</td>
                        <td>${new Date(rol.created_at).toLocaleDateString('nl-NL')}</td>
                        <td class="admin-buttons">
                            <button class="btn btn-secondary edit-user-btn" data-userid="${rol.user_id}">✏️ Bewerken</button>
                            <button class="btn btn-danger delete-user-btn" data-userid="${rol.user_id}">🗑️ Verwijderen</button>
                        </td>
                    </tr>
                `;
            }
            
            html += `
                    </tbody>
                </table>
            `;
            
            gebruikersLijst.innerHTML = html;
            
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
    
    // Laad chauffeurs
    async function laadChauffeurs() {
        if (!chauffeursLijst) return;
        
        chauffeursLijst.innerHTML = '<p>Bezig met laden...</p>';
        
        try {
            const { data: chauffeurs, error } = await window.supabase
                .from('gebruikers_rollen')
                .select('*')
                .eq('is_chauffeur', true)
                .order('chauffeur_nummer', { ascending: true });
            
            if (error) throw error;
            
            if (!chauffeurs || chauffeurs.length === 0) {
                chauffeursLijst.innerHTML = '<p>Geen chauffeurs gevonden. Wijs een gebruiker aan als chauffeur.</p>';
                return;
            }
            
            let html = `
                <table>
                    <thead>
                        <tr>
                            <th>Chauffeursnummer</th>
                            <th>User ID</th>
                            <th>Telefoon</th>
                            <th>Rol</th>
                            <th>Acties</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            for (const chauffeur of chauffeurs) {
                html += `
                    <tr>
                        <td>${chauffeur.chauffeur_nummer || '-'}</td>
                        <td>${chauffeur.user_id.substring(0, 8)}...</td>
                        <td>${chauffeur.chauffeur_telefoon || '-'}</td>
                        <td>${chauffeur.rol === 'admin' ? '👑 Admin' : '👤 Gebruiker'}</td>
                        <td class="admin-buttons">
                            <button class="btn btn-secondary edit-chauffeur-btn" data-userid="${chauffeur.user_id}">✏️ Bewerken</button>
                        </td>
                    </tr>
                `;
            }
            
            html += `
                    </tbody>
                </table>
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
    
    // Laad statistieken
    async function laadStatistieken() {
        try {
            const { count: adresCount } = await window.supabase
                .from('adressen')
                .select('*', { count: 'exact', head: true });
            
            if (aantalAdressenSpan) aantalAdressenSpan.textContent = adresCount || 0;
            
        } catch (err) {
            console.error('Fout bij laden statistieken:', err);
        }
    }
    
    // Gebruiker bewerken
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
    
    // Gebruiker verwijderen
    async function verwijderGebruiker(userId) {
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
    
    // Nieuwe gebruiker
    if (addUserBtn) {
        addUserBtn.addEventListener('click', () => {
            currentUserId = null;
            userPopupTitle.textContent = 'Nieuwe gebruiker';
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
    
    // Toon/verberg chauffeur velden
    if (userIsChauffeur) {
        userIsChauffeur.addEventListener('change', (e) => {
            chauffeurVelden.style.display = e.target.value === 'true' ? 'block' : 'none';
        });
    }
    
    // Opslaan gebruiker
    if (saveUserBtn) {
        saveUserBtn.addEventListener('click', async () => {
            const email = document.getElementById('userEmail').value;
            const password = document.getElementById('userPassword').value;
            const rol = document.getElementById('userRol').value;
            const isChauffeur = document.getElementById('userIsChauffeur').value === 'true';
            const chauffeurNummer = document.getElementById('chauffeurNummer').value;
            const chauffeurTelefoon = document.getElementById('chauffeurTelefoon').value;
            
            if (!email) {
                alert('E-mailadres is verplicht');
                return;
            }
            
            if (!currentUserId && (!password || password.length < 6)) {
                alert('Wachtwoord is verplicht en moet minimaal 6 tekens bevatten');
                return;
            }
            
            try {
                if (currentUserId) {
                    // Update bestaande gebruiker
                    const { error } = await window.supabase
                        .from('gebruikers_rollen')
                        .update({
                            rol: rol,
                            is_chauffeur: isChauffeur,
                            chauffeur_nummer: chauffeurNummer || null,
                            chauffeur_telefoon: chauffeurTelefoon || null
                        })
                        .eq('user_id', currentUserId);
                    
                    if (error) throw error;
                    alert('Gebruiker bijgewerkt');
                    
                } else {
                    // Nieuwe gebruiker aanmaken
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
                                rol: rol,
                                is_chauffeur: isChauffeur,
                                chauffeur_nummer: chauffeurNummer || null,
                                chauffeur_telefoon: chauffeurTelefoon || null
                            }]);
                        
                        if (rolError) throw rolError;
                        alert(`Gebruiker ${email} aangemaakt!`);
                    }
                }
                
                userPopup.style.display = 'none';
                laadGebruikers();
                laadChauffeurs();
                laadStatistieken();
                
            } catch (err) {
                alert('Fout: ' + err.message);
            }
        });
    }
    
    // Startpunt opslaan
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
            } else if (tabId === 'instellingen') {
                document.getElementById('tabInstellingen').classList.add('active');
                laadStatistieken();
            }
        });
    });
    
    // Popup sluiten
    if (closeUserPopup) {
        closeUserPopup.addEventListener('click', () => {
            userPopup.style.display = 'none';
        });
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === userPopup) {
            userPopup.style.display = 'none';
        }
    });
    
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Initialiseer
    laadGebruikers();
    laadStatistieken();
    
    // Laad opgeslagen startpunt
    const opgeslagenStartpunt = localStorage.getItem('abbott_startpunt');
    if (opgeslagenStartpunt && startpuntInstelling) {
        try {
            const parsed = JSON.parse(opgeslagenStartpunt);
            startpuntInstelling.value = parsed.adres;
        } catch(e) {}
    }
    
});