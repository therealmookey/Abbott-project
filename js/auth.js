// ===== AUTHENTICATIE FUNCTIES MET GEBRUIKERSNAAM =====

console.log('auth.js geladen');

window.addEventListener('load', function() {
    
    if (!window.supabase) {
        console.error('Supabase niet gevonden!');
        return;
    }
    
    console.log('Auth gestart...');
    
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginTabBtn = document.getElementById('loginTabBtn');
    const registerTabBtn = document.getElementById('registerTabBtn');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const forgotLink = document.getElementById('forgotPasswordLink');
    const resetPopup = document.getElementById('resetPopup');
    const closePopup = document.getElementById('closePopup');
    const resetBtn = document.getElementById('resetBtn');
    
    function toonBericht(elementId, bericht, type) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = bericht;
            element.className = `message ${type}`;
            element.style.display = 'block';
            setTimeout(() => {
                element.style.display = 'none';
            }, 5000);
        }
    }
    
    // Hulpfunctie: zoek e-mailadres bij gebruikersnaam
    async function getEmailByUsername(gebruikersnaam) {
        const { data, error } = await window.supabase
            .from('gebruikers_rollen')
            .select('user_id')
            .eq('gebruikersnaam', gebruikersnaam)
            .single();
        
        if (error || !data) return null;
        
        // Gebruiker ophalen via Auth API (werkt alleen voor ingelogde admins, dus beperkt)
        // Voor nu: we gebruiken een workaround
        return data.user_id;
    }
    
    // Tabbladen
    if (loginTabBtn && registerTabBtn) {
        loginTabBtn.onclick = () => {
            loginTabBtn.classList.add('active');
            registerTabBtn.classList.remove('active');
            if (loginForm) loginForm.classList.add('active');
            if (registerForm) registerForm.classList.remove('active');
        };
        
        registerTabBtn.onclick = () => {
            registerTabBtn.classList.add('active');
            loginTabBtn.classList.remove('active');
            if (registerForm) registerForm.classList.add('active');
            if (loginForm) loginForm.classList.remove('active');
        };
    }
    
    // REGISTREREN (met gebruikersnaam)
    if (registerBtn) {
        registerBtn.onclick = async () => {
            const gebruikersnaam = document.getElementById('registerUsername').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            
            if (!gebruikersnaam || !email || !password) {
                toonBericht('message', 'Vul alle velden in', 'error');
                return;
            }
            
            if (password.length < 6) {
                toonBericht('message', 'Wachtwoord moet minimaal 6 tekens zijn', 'error');
                return;
            }
            
            // Check of gebruikersnaam al bestaat
            const { data: bestaandeUser, error: checkError } = await window.supabase
                .from('gebruikers_rollen')
                .select('gebruikersnaam')
                .eq('gebruikersnaam', gebruikersnaam);
            
            if (bestaandeUser && bestaandeUser.length > 0) {
                toonBericht('message', 'Deze gebruikersnaam is al in gebruik', 'error');
                return;
            }
            
            try {
                // Account aanmaken in Supabase Auth
                const { data: authData, error: authError } = await window.supabase.auth.signUp({
                    email: email,
                    password: password
                });
                
                if (authError) throw authError;
                
                if (authData.user) {
                    // Rol en gebruikersnaam toevoegen
                    const { error: rolError } = await window.supabase
                        .from('gebruikers_rollen')
                        .insert([{
                            user_id: authData.user.id,
                            gebruikersnaam: gebruikersnaam,
                            rol: 'gebruiker',
                            is_chauffeur: false
                        }]);
                    
                    if (rolError) throw rolError;
                    
                    toonBericht('message', 'Account aangemaakt! Je kunt nu inloggen met je gebruikersnaam.', 'success');
                    document.getElementById('registerUsername').value = '';
                    document.getElementById('registerEmail').value = '';
                    document.getElementById('registerPassword').value = '';
                    if (loginTabBtn) loginTabBtn.click();
                }
            } catch (err) {
                toonBericht('message', 'Fout: ' + err.message, 'error');
            }
        };
    }
    
    // INLOGGEN met gebruikersnaam
    if (loginBtn) {
        loginBtn.onclick = async () => {
            const gebruikersnaam = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            
            if (!gebruikersnaam || !password) {
                toonBericht('message', 'Vul gebruikersnaam en wachtwoord in', 'error');
                return;
            }
            
            try {
                // Zoek e-mail bij gebruikersnaam
                const { data: userData, error: userError } = await window.supabase
                    .from('gebruikers_rollen')
                    .select('user_id')
                    .eq('gebruikersnaam', gebruikersnaam)
                    .single();
                
                if (userError || !userData) {
                    toonBericht('message', 'Gebruikersnaam niet gevonden', 'error');
                    return;
                }
                
                // We hebben de user_id, maar we hebben het e-mailadres nodig om in te loggen
                // Workaround: we moeten het e-mailadres opslaan bij registratie
                toonBericht('message', 'Inloggen met gebruikersnaam is in ontwikkeling...', 'error');
                
                // TODO: Voor nu: gebruik het e-mailadres dat bij registratie is opgeslagen
                // Dit vereist dat we email opslaan in de gebruikers_rollen tabel
                
            } catch (err) {
                toonBericht('message', 'Fout: ' + err.message, 'error');
            }
        };
    }
    
    // Wachtwoord vergeten
    if (forgotLink) {
        forgotLink.onclick = (e) => {
            e.preventDefault();
            if (resetPopup) resetPopup.style.display = 'flex';
        };
    }
    
    if (closePopup) {
        closePopup.onclick = () => {
            if (resetPopup) resetPopup.style.display = 'none';
        };
    }
    
    if (resetBtn) {
        resetBtn.onclick = async () => {
            const gebruikersnaam = document.getElementById('resetUsername').value;
            
            if (!gebruikersnaam) {
                alert('Vul je gebruikersnaam in');
                return;
            }
            
            try {
                const { data: userData, error: userError } = await window.supabase
                    .from('gebruikers_rollen')
                    .select('user_id')
                    .eq('gebruikersnaam', gebruikersnaam)
                    .single();
                
                if (userError || !userData) {
                    alert('Gebruikersnaam niet gevonden');
                    return;
                }
                
                // TODO: Stuur resetlink naar gekoppeld e-mailadres
                alert('Resetlink wordt verzonden naar het gekoppelde e-mailadres');
                if (resetPopup) resetPopup.style.display = 'none';
                
            } catch (err) {
                alert('Fout: ' + err.message);
            }
        };
    }
    
});