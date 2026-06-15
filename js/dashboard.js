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
        if (typeof window.supabase === 'undefined') {
            alert('Supabase is niet beschikbaar');
            return;
        }
        
        // Haal aantal adressen en planningen op
        const { count: adresCount } = await window.supabase
            .from('adressen')
            .select('*', { count: 'exact', head: true });
        
        const { count: planningCount } = await window.supabase
            .from('planningen')
            .select('*', { count: 'exact', head: true });
        
        alert(`📊 Statistieken\n\n📍 Aantal adressen: ${adresCount || 0}\n📅 Aantal planningen: ${planningCount || 0}`);
    });
}

// Initialiseer dashboard
toonUserEmail();