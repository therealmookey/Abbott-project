// ===== AUTHENTICATIE FUNCTIES (alleen voor index.html) =====

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

// Tabbladen wisselen
if (loginTabBtn && registerTabBtn) {
    loginTabBtn.addEventListener('click', () => {
        loginTabBtn.classList.add('active');
        registerTabBtn.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    });
    
    registerTabBtn.addEventListener('click', () => {
        registerTabBtn.classList.add('active');
        loginTabBtn.classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
    });
}

// REGISTREREN
if (registerBtn) {
    registerBtn.addEventListener('click', async () => {
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
        
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password
        });
        
        if (error) {
            toonBericht('message', error.message, 'error');
        } else {
            toonBericht('message', 'Account aangemaakt! Controleer je e-mail voor bevestiging (indien ingeschakeld). Je kunt nu inloggen.', 'success');
            // Leeg de velden
            document.getElementById('registerEmail').value = '';
            document.getElementById('registerPassword').value = '';
            // Ga terug naar login tab
            loginTabBtn.click();
        }
    });
}

// INLOGGEN
if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
            toonBericht('message', 'Vul e-mail en wachtwoord in', 'error');
            return;
        }
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            toonBericht('message', error.message, 'error');
        } else {
            toonBericht('message', 'Ingelogd! Je wordt doorgestuurd...', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        }
    });
}

// WACHTWOORD VERGETEN - popup tonen
if (forgotLink) {
    forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        resetPopup.style.display = 'flex';
    });
}

if (closePopup) {
    closePopup.addEventListener('click', () => {
        resetPopup.style.display = 'none';
    });
}

// Reset wachtwoord
if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
        const email = document.getElementById('resetEmail').value;
        
        if (!email) {
            alert('Vul je e-mailadres in');
            return;
        }
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password.html'
        });
        
        if (error) {
            alert('Fout: ' + error.message);
        } else {
            alert('Resetlink verzonden! Controleer je e-mail.');
            resetPopup.style.display = 'none';
            document.getElementById('resetEmail').value = '';
        }
    });
}

// Enter toets voor inloggen
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        if (loginForm.classList.contains('active')) {
            loginBtn.click();
        } else if (registerForm.classList.contains('active')) {
            registerBtn.click();
        }
    }
});