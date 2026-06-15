// ===== AUTHENTICATIE FUNCTIES =====

// Wacht tot de pagina volledig geladen is
window.addEventListener('load', function() {
    
    // Check of supabase bestaat
    if (!window.supabase) {
        console.error('Supabase niet gevonden!');
        return;
    }
    
    console.log('Auth gestart...');
    
    // DOM elementen
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
    
    // REGISTREREN
    if (registerBtn) {
        registerBtn.onclick = async () => {
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            
            if (!email || !password) {
                toonBericht('message', 'Vul alle velden in', 'error');
                return;
            }
            
            if (password.length < 6) {
                toonBericht('message', 'Wachtwoord moet minimaal 6 tekens zijn', 'error');
                return;
            }
            
            try {
                const { data, error } = await window.supabase.auth.signUp({
                    email: email,
                    password: password
                });
                
                if (error) {
                    toonBericht('message', error.message, 'error');
                } else {
                    toonBericht('message', 'Account aangemaakt! Je kunt nu inloggen.', 'success');
                    document.getElementById('registerEmail').value = '';
                    document.getElementById('registerPassword').value = '';
                    if (loginTabBtn) loginTabBtn.click();
                }
            } catch (err) {
                toonBericht('message', 'Fout: ' + err.message, 'error');
            }
        };
    }
    
    // INLOGGEN
    if (loginBtn) {
        loginBtn.onclick = async () => {
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            if (!email || !password) {
                toonBericht('message', 'Vul e-mail en wachtwoord in', 'error');
                return;
            }
            
            try {
                const { data, error } = await window.supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });
                
                if (error) {
                    toonBericht('message', error.message, 'error');
                } else {
                    toonBericht('message', 'Ingelogd! Doorsturen...', 'success');
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1500);
                }
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
            const email = document.getElementById('resetEmail').value;
            if (!email) {
                alert('Vul je e-mailadres in');
                return;
            }
            
            try {
                const { error } = await window.supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + '/Abbott-project/reset-password.html'
                });
                
                if (error) {
                    alert('Fout: ' + error.message);
                } else {
                    alert('Resetlink verzonden! Controleer je e-mail.');
                    if (resetPopup) resetPopup.style.display = 'none';
                }
            } catch (err) {
                alert('Fout: ' + err.message);
            }
        };
    }
    
});