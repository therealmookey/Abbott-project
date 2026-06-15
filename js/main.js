// ===== GEMEENSCHAPPELIJKE FUNCTIES =====

// Laad navigatie in elke pagina (behalve index.html)
async function laadNavigatie() {
    const placeholder = document.getElementById('navigatie-placeholder');
    if (!placeholder) return;
    
    try {
        const response = await fetch('includes/navigatie.html');
        const html = await response.text();
        placeholder.innerHTML = html;
        
        // Koppel logout knop na laden navigatie
        const logoutBtn = document.getElementById('logoutBtnNav');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await window.supabase.auth.signOut();
                window.location.href = 'index.html';
            });
        }
    } catch (error) {
        console.error('Fout bij laden navigatie:', error);
    }
}

// Toon bericht op pagina
function toonBericht(elementId, bericht, type = 'success') {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = bericht;
        element.className = `message ${type}`;
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

// Check of gebruiker is ingelogd (beveiliging)
async function checkAuth() {
    if (typeof window.supabase === 'undefined') {
        console.error('Supabase niet beschikbaar');
        window.location.href = 'index.html';
        return null;
    }
    
    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
        return null;
    }
    return session;
}

// Haal huidige gebruiker op
async function getCurrentUser() {
    if (typeof window.supabase === 'undefined') return null;
    const { data: { user } } = await window.supabase.auth.getUser();
    return user;
}

// Laad navigatie bij elke pagina
document.addEventListener('DOMContentLoaded', laadNavigatie);