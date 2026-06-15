// ===== GEMEENSCHAPPELIJKE FUNCTIES =====

async function laadNavigatie() {
    const placeholder = document.getElementById('navigatie-placeholder');
    if (!placeholder) return;
    
    try {
        const response = await fetch('includes/navigatie.html');
        const html = await response.text();
        placeholder.innerHTML = html;
        
        const logoutBtn = document.getElementById('logoutBtnNav');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                if (window.supabaseClient) await window.supabaseClient.auth.signOut();
                window.location.href = 'index.html';
            });
        }
    } catch (error) {
        console.error('Fout bij laden navigatie:', error);
    }
}

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

async function checkAuth() {
    if (typeof window.supabaseClient === 'undefined') {
        window.location.href = 'index.html';
        return null;
    }
    
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
        return null;
    }
    return session;
}

async function getCurrentUser() {
    if (typeof window.supabaseClient === 'undefined') return null;
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    return user;
}

document.addEventListener('DOMContentLoaded', laadNavigatie);