// ===== DASHBOARD FUNCTIES =====

// Deze functie checkt of de gebruiker is ingelogd, maar gooit hem er niet meteen uit.
async function checkDashboardAuth() {
    // Wacht kort om te zorgen dat alles is geladen
    setTimeout(async () => {
        // Check of we Supabase hebben
        if (typeof window.supabase === 'undefined') {
            console.error('Geen Supabase in dashboard. Doorverwijzen naar login.');
            window.location.href = 'index.html';
            return;
        }

        // Vraag de huidige sessie op
        const { data: { session }, error } = await window.supabase.auth.getSession();
        
        if (error) {
            console.error('Fout bij ophalen sessie:', error);
            window.location.href = 'index.html';
            return;
        }
        
        if (!session) {
            console.log('Geen sessie gevonden, terug naar login.');
            window.location.href = 'index.html';
        } else {
            console.log('Sessie is geldig voor:', session.user.email);
            // Toon het e-mailadres in de header
            toonUserEmail(session.user.email);
        }
    }, 100);
}

function toonUserEmail(email) {
    const userEmailSpan = document.getElementById('userEmail');
    if (userEmailSpan) {
        userEmailSpan.textContent = email;
    }
}

// Statistieken knop
const statsBtn = document.getElementById('statsBtn');
if (statsBtn) {
    statsBtn.addEventListener('click', async () => {
        if (typeof window.supabase === 'undefined') {
            alert('Supabase is niet beschikbaar');
            return;
        }
        
        const { count: adresCount } = await window.supabase
            .from('adressen')
            .select('*', { count: 'exact', head: true });
        
        const { count: planningCount } = await window.supabase
            .from('planningen')
            .select('*', { count: 'exact', head: true });
        
        alert(`📊 Statistieken\n\n📍 Aantal adressen: ${adresCount || 0}\n📅 Aantal planningen: ${planningCount || 0}`);
    });
}

// Start de check
checkDashboardAuth();