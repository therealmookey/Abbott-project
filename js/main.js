// ===== GEMEENSCHAPPELIJKE FUNCTIES =====

console.log('main.js geladen');

async function laadNavigatie() {
    const placeholder = document.getElementById('navigatie-placeholder');
    if (!placeholder) return;
    
    try {
        const response = await fetch('includes/navigatie.html');
        if (!response.ok) throw new Error('Navigatie kon niet geladen worden');
        const html = await response.text();
        placeholder.innerHTML = html;
        
        // Toon admin link als de gebruiker admin is
        await toonAdminLink();
        
        const logoutBtn = document.getElementById('logoutBtnNav');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (window.supabase) await window.supabase.auth.signOut();
                window.location.href = 'index.html';
            });
        }
    } catch (error) {
        console.error('Fout bij laden navigatie:', error);
        placeholder.innerHTML = '<nav style="background:#2c7da0; padding:10px; color:white;">Menu laden mislukt</nav>';
    }
}

// Check of de ingelogde gebruiker admin is en toon de admin link
async function toonAdminLink() {
    const adminLink = document.getElementById('adminLink');
    if (!adminLink) return;
    
    if (!window.supabase) {
        adminLink.style.display = 'none';
        return;
    }
    
    try {
        const { data: { user } } = await window.supabase.auth.getUser();
        if (!user) {
            adminLink.style.display = 'none';
            return;
        }
        
        // Controleer of de gebruiker admin is in de gebruikers_rollen tabel
        const { data, error } = await window.supabase
            .from('gebruikers_rollen')
            .select('rol')
            .eq('user_id', user.id)
            .maybeSingle();
        
        if (error) {
            console.error('Fout bij admin check:', error);
            adminLink.style.display = 'none';
            return;
        }
        
        const isAdmin = data && data.rol === 'admin';
        adminLink.style.display = isAdmin ? 'inline-block' : 'none';
        
        if (isAdmin) {
            console.log('Admin link getoond voor:', user.email);
        }
        
    } catch (err) {
        console.error('Fout bij admin check:', err);
        adminLink.style.display = 'none';
    }
}

// Check auth voor beveiligde pagina's
async function checkAuth() {
    if (typeof window.supabase === 'undefined') {
        return false;
    }
    
    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Huidige gebruiker ophalen
async function getCurrentUser() {
    if (typeof window.supabase === 'undefined') return null;
    const { data: { user } } = await window.supabase.auth.getUser();
    return user;
}

// Laad navigatie als de DOM klaar is
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('navigatie-placeholder')) {
        laadNavigatie();
    }
});