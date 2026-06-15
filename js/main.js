// ===== GEMEENSCHAPPELIJKE FUNCTIES =====

async function laadNavigatie() {
    const placeholder = document.getElementById('navigatie-placeholder');
    if (!placeholder) return;
    
    try {
        const response = await fetch('includes/navigatie.html');
        if (!response.ok) throw new Error('Navigatie kon niet geladen worden');
        const html = await response.text();
        placeholder.innerHTML = html;
        
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
        // Geen redirect, alleen een foutmelding in de console
        placeholder.innerHTML = '<nav style="background:#ccc; padding:10px;">Menu laden mislukt</nav>';
    }
}

// Check alleen of iemand is ingelogd voor beveiligde pagina's
async function checkAuth() {
    if (typeof window.supabase === 'undefined') {
        return false;
    }
    
    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session) {
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

// Laad navigatie als de DOM klaar is, maar alleen als er een placeholder is.
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('navigatie-placeholder')) {
        laadNavigatie();
    }
});