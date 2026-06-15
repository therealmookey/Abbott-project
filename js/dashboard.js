// ===== DASHBOARD FUNCTIES =====

// Check of gebruiker is ingelogd
checkAuth();

// Toon gebruikers e-mail op dashboard
async function toonUserEmail() {
    const user = await getCurrentUser();
    const userEmailSpan = document.getElementById('userEmail');
    if (userEmailSpan && user) {
        userEmailSpan.textContent = user.email;
    }
}

// Statistieken knop
const statsBtn = document.getElementById('statsBtn');
if (statsBtn) {
    statsBtn.addEventListener('click', async () => {
        // Haal aantal adressen en planningen op
        const { count: adresCount } = await supabase
            .from('ziekenhuis_adressen')
            .select('*', { count: 'exact', head: true });
        
        const { count: planningCount } = await supabase
            .from('planningen')
            .select('*', { count: 'exact', head: true });
        
        alert(`📊 Statistieken\n\n📍 Aantal ziekenhuisadressen: ${adresCount || 0}\n📅 Aantal planningen: ${planningCount || 0}`);
    });
}

// Initialiseer dashboard
toonUserEmail();