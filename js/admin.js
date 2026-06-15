// ===== ADMIN FUNCTIES - TIJDELIJKE BYPASS =====

console.log('admin.js geladen');

document.addEventListener('DOMContentLoaded', async function() {
    
    if (!window.supabase) {
        console.error('Supabase niet beschikbaar!');
        return;
    }
    
    // TIJDELIJKE BYPASS - verwijder deze regel later!
    // Forceer admin toegang voor testen
    let isAdmin = true;
    let currentUser = null;
    
    try {
        const { data: { user } } = await window.supabase.auth.getUser();
        currentUser = user;
        console.log('Ingelogde user:', user?.email);
        
        if (user) {
            // Probeer admin status op te halen
            const { data: userRollen } = await window.supabase
                .from('gebruikers_rollen')
                .select('rol')
                .eq('user_id', user.id);
            
            if (userRollen && userRollen.length > 0) {
                isAdmin = (userRollen[0].rol === 'admin');
                console.log('Admin status uit database:', isAdmin);
            }
        }
    } catch (err) {
        console.error('Fout bij admin check:', err);
    }
    
    if (!isAdmin) {
        alert('Je hebt geen toegang tot deze pagina. Alleen admins kunnen hier komen.');
        window.location.href = 'dashboard.html';
        return;
    }
    
    console.log('✅ Admin toegang verleend!');
    
    // REST VAN DE ADMIN CODE HIERONDER (blijft hetzelfde)
    // ... (de rest van je admin.js code)
});