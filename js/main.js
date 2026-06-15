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
        placeholder.innerHTML = '<nav style="background:#2c7da0; padding:10px; color:white;">Menu laden mislukt</nav>';
    }
}

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

async function getCurrentUser() {
    if (typeof window.supabase === 'undefined') return null;
    const { data: { user } } = await window.supabase.auth.getUser();
    return user;
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('navigatie-placeholder')) {
        laadNavigatie();
    }
});