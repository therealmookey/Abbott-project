// ===== DASHBOARD FUNCTIES =====

async function checkDashboardAuth() {
    if (typeof window.supabase === 'undefined') {
        console.error('Geen Supabase in dashboard');
        window.location.href = 'index.html';
        return;
    }

    const { data: { session }, error } = await window.supabase.auth.getSession();
    
    if (error || !session) {
        console.log('Geen sessie gevonden, terug naar login.');
        window.location.href = 'index.html';
    } else {
        console.log('Sessie is geldig voor:', session.user.email);
        toonUserEmail(session.user.email);
    }
}

function toonUserEmail(email) {
    const userEmailSpan = document.getElementById('userEmail');
    if (userEmailSpan) {
        userEmailSpan.textContent = email;
    }
}

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

checkDashboardAuth();