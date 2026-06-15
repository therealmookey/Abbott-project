// ===== PROFIEL FUNCTIES =====

checkAuth();

// DOM elementen
const profielEmail = document.getElementById('profielEmail');
const profielAangemaakt = document.getElementById('profielAangemaakt');
const profielLaatsteInlog = document.getElementById('profielLaatsteInlog');
const updateWachtwoordBtn = document.getElementById('updateWachtwoordBtn');
const logoutBtnProfiel = document.getElementById('logoutBtnProfiel');

// Toon profielgegevens
async function toonProfiel() {
    const user = await getCurrentUser();
    if (user && profielEmail) {
        profielEmail.textContent = user.email;
        
        // Aanmaakdatum account (als beschikbaar)
        if (user.created_at) {
            profielAangemaakt.textContent = new Date(user.created_at).toLocaleDateString('nl-NL');
        }
        
        // Laatste inlog (uit session, beetje een workaround)
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.created_at) {
            profielLaatsteInlog.textContent = new Date(session.created_at).toLocaleDateString('nl-NL') + ' ' + 
                                               new Date(session.created_at).toLocaleTimeString('nl-NL');
        }
    }
}

// Wachtwoord wijzigen
if (updateWachtwoordBtn) {
    updateWachtwoordBtn.addEventListener('click', async () => {
        const huidig = document.getElementById('huidigWachtwoord').value;
        const nieuw = document.getElementById('nieuwWachtwoord').value;
        const bevestig = document.getElementById('bevestigWachtwoord').value;
        
        if (!huidig || !nieuw || !bevestig) {
            alert('Vul alle wachtwoordvelden in');
            return;
        }
        
        if (nieuw !== bevestig) {
            alert('Nieuw wachtwoord en bevestiging komen niet overeen');
            return;
        }
        
        if (nieuw.length < 6) {
            alert('Nieuw wachtwoord moet minimaal 6 tekens zijn');
            return;
        }
        
        // Eerst verifiëren met huidig wachtwoord
        const user = await getCurrentUser();
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: huidig
        });
        
        if (signInError) {
            alert('Huidig wachtwoord is onjuist');
            return;
        }
        
        // Wachtwoord bijwerken
        const { error } = await supabase.auth.updateUser({
            password: nieuw
        });
        
        if (error) {
            alert('Fout bij updaten wachtwoord: ' + error.message);
        } else {
            alert('Wachtwoord succesvol bijgewerkt!');
            document.getElementById('huidigWachtwoord').value = '';
            document.getElementById('nieuwWachtwoord').value = '';
            document.getElementById('bevestigWachtwoord').value = '';
        }
    });
}

// Uitloggen
if (logoutBtnProfiel) {
    logoutBtnProfiel.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    });
}

// Initialiseer profiel
toonProfiel();