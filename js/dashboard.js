// ===== DASHBOARD FUNCTIES =====

checkAuth();

async function toonUserEmail() {
    const user = await getCurrentUser();
    const userEmailSpan = document.getElementById('userEmail');
    if (userEmailSpan && user) {
        userEmailSpan.textContent = user.email;
    }
}

const statsBtn = document.getElementById('statsBtn');
if (statsBtn) {
    statsBtn.addEventListener('click', async () => {
        if (typeof window.supabaseClient === 'undefined') {
            alert('Supabase is niet beschikbaar');
            return;
        }
        
        const { count: adresCount } = await window.supabaseClient
            .from('adressen')
            .select('*', { count: 'exact', head: true });
        
        const { count: planningCount } = await window.supabaseClient
            .from('planningen')
            .select('*', { count: 'exact', head: true });
        
        alert(`📊 Statistieken\n\n📍 Aantal adressen: ${adresCount || 0}\n📅 Aantal planningen: ${planningCount || 0}`);
    });
}

toonUserEmail();