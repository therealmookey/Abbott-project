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

// ===== OPHALING ANALYSE =====

async function laadOphalingAnalyse() {
    const analyseLijst = document.getElementById('analyseLijst');
    if (!analyseLijst) return;
    
    analyseLijst.innerHTML = '<p>Bezig met laden...</p>';
    
    try {
        const { data, error } = await window.supabase
            .from('ophaling_analyse')
            .select('*');
        
        if (error) {
            console.error('Fout bij laden analyse:', error);
            analyseLijst.innerHTML = `<p class="error">Fout bij laden: ${error.message}</p>`;
            return;
        }
        
        if (!data || data.length === 0) {
            analyseLijst.innerHTML = '<p>Nog geen ophalingen geregistreerd. Voeg ophalingen toe in de registraties.</p>';
            return;
        }
        
        // Filter op ziekenhuizen die binnen 5 dagen een ophaling nodig hebben
        const vandaag = new Date();
        vandaag.setHours(0, 0, 0, 0);
        
        const binnenkort = data.filter(item => {
            if (!item.verwachte_volgende) return false;
            const verwachteDatum = new Date(item.verwachte_volgende);
            verwachteDatum.setHours(0, 0, 0, 0);
            const dagenVerschil = Math.ceil((verwachteDatum - vandaag) / (1000 * 60 * 60 * 24));
            return dagenVerschil >= 0 && dagenVerschil <= 5;
        });
        
        // Ook items die al te laat zijn
        const teLaat = data.filter(item => item.status === 'Te laat');
        
        // Combineer en verwijder dubbelen
        const teLatenIds = teLaat.map(i => i.ziekenhuis_id);
        const filteredData = [...teLaat];
        for (const item of binnenkort) {
            if (!teLatenIds.includes(item.ziekenhuis_id)) {
                filteredData.push(item);
            }
        }
        
        // Sorteer op status (te laat eerst)
        filteredData.sort((a, b) => {
            if (a.status === 'Te laat' && b.status !== 'Te laat') return -1;
            if (a.status !== 'Te laat' && b.status === 'Te laat') return 1;
            return a.instelling_naam.localeCompare(b.instelling_naam);
        });
        
        if (filteredData.length === 0) {
            analyseLijst.innerHTML = '<p>✅ Alle ziekenhuizen zijn op schema. Er zijn geen ophalingen nodig in de komende 5 dagen.</p>';
            return;
        }
        
        let html = `<div class="analyse-totaal">⚠️ ${filteredData.length} ziekenhuis(sen) hebben binnenkort een ophaling nodig</div>`;
        
        for (const item of filteredData) {
            const statusClass = item.status === 'Te laat' ? 'status-danger' : 
                               (item.status === 'Bijna te laat' ? 'status-warning' : 'status-info');
            
            // Emoji voor status
            let statusEmoji = '🟢';
            if (item.status === 'Te laat') statusEmoji = '🔴';
            else if (item.status === 'Bijna te laat') statusEmoji = '🟡';
            
            // Bepaal of het binnen 5 dagen is
            const verwachteDatum = new Date(item.verwachte_volgende);
            verwachteDatum.setHours(0, 0, 0, 0);
            const dagenVerschil = Math.ceil((verwachteDatum - vandaag) / (1000 * 60 * 60 * 24));
            const isBinnenkort = dagenVerschil >= 0 && dagenVerschil <= 5;
            
            let dagenText = '';
            if (item.status === 'Te laat') {
                dagenText = `<span class="badge badge-danger">${item.dagen_sinds_laatste} dagen geleden</span>`;
            } else if (isBinnenkort) {
                dagenText = `<span class="badge badge-info">Over ${dagenVerschil} dagen verwacht</span>`;
            }
            
            html += `
                <div class="analyse-item ${statusClass}">
                    <div class="analyse-item-header">
                        <strong>${escapeHtml(item.instelling_naam)}</strong>
                        <span class="analyse-status">${statusEmoji} ${item.status}</span>
                    </div>
                    <div class="analyse-item-details">
                        <div>📍 ${escapeHtml(item.straat)}, ${escapeHtml(item.postcode)} ${escapeHtml(item.plaats)}</div>
                        ${item.contactpersoon_naam ? `<div>👤 ${escapeHtml(item.contactpersoon_naam)} ${item.contactpersoon_email ? `- 📧 ${escapeHtml(item.contactpersoon_email)}` : ''}</div>` : ''}
                        <div class="analyse-stats">
                            <span>📊 Gemiddeld: ${item.gemiddeld_interval} dagen</span>
                            <span>📋 Aantal ophalingen: ${item.aantal_ophalingen}</span>
                            <span>📅 Laatste: ${new Date(item.laatste_ophaling).toLocaleDateString('nl-NL')}</span>
                            ${item.verwachte_volgende ? `<span>🔮 Verwachte volgende: ${new Date(item.verwachte_volgende).toLocaleDateString('nl-NL')}</span>` : ''}
                            ${dagenText}
                        </div>
                    </div>
                </div>
            `;
        }
        
        analyseLijst.innerHTML = html;
        
    } catch (err) {
        console.error('Fout bij laden analyse:', err);
        analyseLijst.innerHTML = `<p class="error">Fout bij laden: ${err.message}</p>`;
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
        
        const { count: adresCount } = await window.supabase
            .from('adressen')
            .select('*', { count: 'exact', head: true });
        
        const { count: planningCount } = await window.supabase
            .from('planningen')
            .select('*', { count: 'exact', head: true });
        
        alert(`📊 Statistieken\n\n📍 Aantal adressen: ${adresCount || 0}\n📅 Aantal planningen: ${planningCount || 0}`);
    });
}

// Initialiseer
checkDashboardAuth();
laadOphalingAnalyse();

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}