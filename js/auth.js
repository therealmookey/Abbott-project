// ===== AUTHENTICATIE FUNCTIES =====

document.addEventListener('DOMContentLoaded', function() {
    
    // Wacht even om zeker te zijn dat supabase geladen is
    setTimeout(function() {
        if (typeof window.supabase === 'undefined') {
            console.error('❌ Supabase is niet geladen!');
            const msgDiv = document.getElementById('message');
            if (msgDiv) {
                msgDiv.innerHTML = '<div class="message error">Configuratiefout: Supabase niet geladen. Probeer de pagina te verversen.</div>';
                msgDiv.style.display = 'block';
            }
            return;
        }
        
        console.log('✅ Supabase is geladen, start auth...');
        
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
                setTimeout(function() {
                    element.style.display = 'none';
                }, 5000);
            }
        }
        
        // Tabbladen
        if (loginTabBtn && registerTabBtn) {
            loginTabBtn.addEventListener('click', function() {
                loginTabBtn.classList.add('active');
                registerTabBtn.classList.remove('active');
                if (loginForm) loginForm.classList.add('active');
                if (registerForm) registerForm.classList.remove('active');
            });
            
            registerTabBtn.addEventListener('click', function() {
                registerTabBtn.classList.add('active');
                loginTabBtn.classList.remove('active');
                if (registerForm) registerForm.classList.add('active');
                if (loginForm) loginForm.classList.remove('active');
            });
        }
        
        // REGISTREREN
        if (registerBtn) {
            registerBtn.addEventListener('click', async function() {
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
                    console.log('Account aanmaken voor:', email);
                    
                    const { data, error } = await window.supabase.auth.signUp({
                        email: email,
                        password: password
                    });
                    
                    if (error) {
                        console.error('Fout:', error);
                        toonBericht('message', error.message, 'error');
                    } else {
                        console.log('Account aangemaakt!');
                        toonBericht('message', 'Account aangemaakt! Je kunt nu inloggen.', 'success');
                        document.getElementById('registerEmail').value = '';
                        document.getElementById('registerPassword').value = '';
                        if (loginTabBtn) loginTabBtn.click();
                    }
                } catch (err) {
                    console.error('Exception:', err);
                    toonBericht('message', 'Er ging iets mis: ' + err.message, 'error');
                }
            });
        }
        
        // INLOGGEN
        if (loginBtn) {
            loginBtn.addEventListener('click', async function() {
                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;
                
                if (!email || !password) {
                    toonBericht('message', 'Vul e-mail en wachtwoord in', 'error');
                    return;
                }
                
                try {
                    console.log('Inloggen met:', email);
                    
                    const { data, error } = await window.supabase.auth.signInWithPassword({
                        email: email,
                        password: password
                    });
                    
                    if (error) {
                        console.error('Login fout:', error);
                        toonBericht('message', error.message, 'error');
                    } else {
                        console.log('Ingelogd!');
                        toonBericht('message', 'Ingelogd! Je wordt doorgestuurd...', 'success');
                        setTimeout(function() {
                            window.location.href = 'dashboard.html';
                        }, 1500);
                    }
                } catch (err) {
                    console.error('Exception:', err);
                    toonBericht('message', 'Er ging iets mis: ' + err.message, 'error');
                }
            });
        }
        
        // Wachtwoord vergeten
        if (forgotLink) {
            forgotLink.addEventListener('click', function(e) {
                e.preventDefault();
                if (resetPopup) resetPopup.style.display = 'flex';
            });
        }
        
        if (closePopup) {
            closePopup.addEventListener('click', function() {
                if (resetPopup) resetPopup.style.display = 'none';
            });
        }
        
        if (resetBtn) {
            resetBtn.addEventListener('click', async function() {
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
                        document.getElementById('resetEmail').value = '';
                    }
                } catch (err) {
                    alert('Fout: ' + err.message);
                }
            });
        }
        
        // Enter toets
        document.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                if (loginForm && loginForm.classList.contains('active')) {
                    if (loginBtn) loginBtn.click();
                } else if (registerForm && registerForm.classList.contains('active')) {
                    if (registerBtn) registerBtn.click();
                }
            }
        });
        
    }, 100); // Kleine vertraging om zeker te zijn dat alles geladen is
});