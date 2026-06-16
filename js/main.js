// ===== GEMEENSCHAPPELIJKE FUNCTIES =====

console.log('main.js geladen');

// ===== MODULE FUNCTIES =====

// Check of een gebruiker toegang heeft tot een module
async function heeftModuleToegang(moduleSleutel) {
    if (!window.supabase) return false;
    
    try {
        const { data: { user } } = await window.supabase.auth.getUser();
        if (!user) return false;
        
        // Admin heeft altijd toegang tot alle modules
        const { data: rollen } = await window.supabase
            .from('gebruikers_rollen')
            .select('rol')
            .eq('user_id', user.id)
            .maybeSingle();
        
        if (rollen && rollen.rol === 'admin') return true;
        
        // Check specifieke module rechten voor deze gebruiker
        const { data: recht, error } = await window.supabase
            .from('gebruikers_module_rechten')
            .select('actief')
            .eq('user_id', user.id)
            .eq('module_sleutel', moduleSleutel)
            .maybeSingle();
        
        if (error) {
            console.error('Fout bij check module rechten:', error);
            return false;
        }
        
        // Als er een specifiek recht is ingesteld, gebruik die waarde
        if (recht) {
            return recht.actief === true;
        }
        
        // Geen specifiek recht: gebruik standaard waarde uit modules tabel
        const { data: module, error: modError } = await window.supabase
            .from('modules')
            .select('standaard_aan')
            .eq('module_sleutel', moduleSleutel)
            .maybeSingle();
        
        if (modError) {
            console.error('Fout bij check module standaard:', modError);
            return false;
        }
        
        return module ? module.standaard_aan : false;
        
    } catch (err) {
        console.error('Exception bij module check:', err);
        return false;
    }
}

// Navigatie links verbergen op basis van modules
async function filterNavigatieModules() {
    try {
        const navLinks = document.querySelectorAll('.nav-links a');
        for (const link of navLinks) {
            const href = link.getAttribute('href');
            if (!href) continue;
            
            // Dashboard en profiel zijn altijd zichtbaar
            if (href === 'dashboard.html' || href === 'profiel.html') continue;
            
            // Admin link speciaal behandelen (alleen voor admins)
            if (href === 'admin.html') {
                const isAdmin = await heeftModuleToegang('admin');
                link.style.display = isAdmin ? 'inline-block' : 'none';
                continue;
            }
            
            // Bepaal module sleutel op basis van href
            let moduleSleutel = '';
            if (href.includes('adressen')) moduleSleutel = 'adressen';
            else if (href.includes('planning')) moduleSleutel = 'planning';
            else if (href.includes('modules')) moduleSleutel = 'modules';
            else if (href.includes('chauffeurs')) moduleSleutel = 'chauffeurs';
            else if (href.includes('route-planner')) moduleSleutel = 'routeplanner';
            else continue;
            
            const heeftToegang = await heeftModuleToegang(moduleSleutel);
            link.style.display = heeftToegang ? 'inline-block' : 'none';
        }
    } catch (err) {
        console.error('Fout bij filteren navigatie modules:', err);
    }
}

// ===== NAVIGATIE FUNCTIES =====

async function laadNavigatie() {
    const placeholder = document.getElementById('navigatie-placeholder');
    if (!placeholder) return;
    
    try {
        const response = await fetch('includes/navigatie.html');
        if (!response.ok) throw new Error('Navigatie kon niet geladen worden');
        const html = await response.text();
        placeholder.innerHTML = html;
        
        // Toon admin link op basis van module rechten
        await filterNavigatieModules();
        
        const logoutBtn = document.getElementById('logoutBtnNav');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (window.supabase) await window.supabase.auth.signOut();
                window.location.href = 'index.html';
            });
        }
        
        // Admin link zichtbaarheid (aanvullende check via class)
        const adminLink = document.getElementById('adminLink');
        if (adminLink) {
            const isAdmin = await heeftModuleToegang('admin');
            adminLink.style.display = isAdmin ? 'inline-block' : 'none';
        }
        
    } catch (error) {
        console.error('Fout bij laden navigatie:', error);
        placeholder.innerHTML = '<nav style="background:#2c7da0; padding:10px; color:white;">Menu laden mislukt</nav>';
    }
}

// ===== AUTH FUNCTIES =====

// Check of gebruiker is ingelogd voor beveiligde pagina's
async function checkAuth() {
    if (typeof window.supabase === 'undefined') {
        return false;
    }
    
    try {
        const { data: { session } } = await window.supabase.auth.getSession();
        if (!session) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    } catch (err) {
        console.error('Auth check error:', err);
        return false;
    }
}

// Huidige gebruiker ophalen
async function getCurrentUser() {
    if (typeof window.supabase === 'undefined') return null;
    try {
        const { data: { user } } = await window.supabase.auth.getUser();
        return user;
    } catch (err) {
        console.error('Fout bij ophalen gebruiker:', err);
        return null;
    }
}

// Check of gebruiker admin is
async function isAdmin() {
    if (typeof window.supabase === 'undefined') return false;
    try {
        const user = await getCurrentUser();
        if (!user) return false;
        
        const { data, error } = await window.supabase
            .from('gebruikers_rollen')
            .select('rol')
            .eq('user_id', user.id)
            .maybeSingle();
        
        if (error) {
            console.error('Admin check error:', error);
            return false;
        }
        
        return data && data.rol === 'admin';
    } catch (err) {
        console.error('Admin check exception:', err);
        return false;
    }
}

// ===== DASHBOARD FUNCTIES =====

// Laad dashboard statistieken (als die er zijn)
async function laadDashboardStatistieken() {
    if (!window.supabase) return;
    
    try {
        // Aantal adressen
        const { count: adresCount } = await window.supabase
            .from('adressen')
            .select('*', { count: 'exact', head: true });
        
        // Aantal planningen vandaag
        const vandaag = new Date().toISOString().split('T')[0];
        const { count: planningCount } = await window.supabase
            .from('planningen')
            .select('*', { count: 'exact', head: true })
            .eq('datum', vandaag);
        
        // Update dashboard elementen als ze bestaan
        const adresCountEl = document.getElementById('dashboardAdresCount');
        const planningCountEl = document.getElementById('dashboardPlanningCount');
        if (adresCountEl) adresCountEl.textContent = adresCount || 0;
        if (planningCountEl) planningCountEl.textContent = planningCount || 0;
        
    } catch (err) {
        console.error('Fout bij laden dashboard statistieken:', err);
    }
}

// ===== INITIALISATIE =====

// Laad navigatie als de DOM klaar is
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('navigatie-placeholder')) {
        laadNavigatie();
    }
});

// Als we op de dashboard pagina zijn, laad statistieken
if (document.getElementById('dashboardAdresCount') || document.getElementById('dashboardPlanningCount')) {
    document.addEventListener('DOMContentLoaded', laadDashboardStatistieken);
}