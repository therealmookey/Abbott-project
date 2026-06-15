// ===== PLANNING FUNCTIES =====

checkAuth();

const planningLijst = document.getElementById('planningLijst');
const newPlanningBtn = document.getElementById('newPlanningBtn');
const planningPopup = document.getElementById('planningPopup');
const savePlanningBtn = document.getElementById('savePlanningBtn');
const closePlanningPopup = document.getElementById('closePlanningPopup');
const planningPopupTitle = document.getElementById('planningPopupTitle');
const instellingSelect = document.getElementById('instellingSelect');
const statusFilter = document.getElementById('statusFilter');
const datumFilter = document.getElementById('datumFilter');
const filterBtn = document.getElementById('filterBtn');

let currentPlanningId = null;
let instellingen = [];

async function laadInstellingen() {
    if (typeof window.supabaseClient === 'undefined') return [];
    
    const { data, error } = await window.supabaseClient
        .from('adressen')
        .select('id, instelling_naam')
        .order('instelling_naam');
    
    if (error) {
        console.error('Fout bij laden instellingen:', error);
        return [];
    }
    instellingen = data || [];
    return instellingen;
}

function vulInstellingDropdown() {
    if (!instellingSelect) return;
    
    instellingSelect.innerHTML = '<option value="">Kies een instelling...</option>';
    instellingen.forEach(inst => {
        const option = document.createElement('option');
        option.value = inst.id;
        option.textContent = inst.instelling_naam;
        instellingSelect.appendChild(option);
    });
}

async function laadPlanningen() {
    if (!planningLijst) return;
    
    planningLijst.innerHTML = '<p>Laden...</p>';
    
    if (typeof window.supabaseClient === 'undefined') {
        planningLijst.innerHTML = '<p class="error">Supabase is niet beschikbaar</p>';
        return;
    }
    
    let query = window.supabaseClient
        .from('planningen')
        .select(`
            *,
            instelling:instelling_id (instelling_naam, straat, plaats)
        `)
        .order('datum', { ascending: true });
    
    if (statusFilter && statusFilter.value !== 'alles') {
        query = query.eq('status', statusFilter.value);
    }
    
    if (datumFilter && datumFilter.value) {
        query = query.eq('datum', datumFilter.value);
    }
    
    const { data, error } = await query;
    
    if (error) {
        planningLijst.innerHTML = `<p class="error">Fout bij laden: ${error.message}</p>`;
        return;
    }
    
    if (!data || data.length === 0) {
        planningLijst.innerHTML = '<p>Geen planningen gevonden. Klik op "+ Nieuwe planning" om er een toe te voegen.</p>';
        return;
    }
    
    planningLijst.innerHTML = '';
    data.forEach(planning => {
        const item = document.createElement('div');
        item.className = 'planning-item';
        
        let statusClass = '';
        if (planning.status === 'gepland') statusClass = 'status-gepland';
        else if (planning.status === 'uitgevoerd') statusClass = 'status-uitgevoerd';
        else if (planning.status === 'geannuleerd') statusClass = 'status-geannuleerd';
        
        item.innerHTML = `
            <div class="planning-info">
                <h4>${escapeHtml(planning.instelling?.instelling_naam || 'Onbekende instelling')}</h4>
                <p>${planning.type === 'ophaling' ? '📦 Ophaling' : '🚚 Afhaling'}</p>
                <p>📅 ${formatDate(planning.datum)} om ${planning.tijd}</p>
                ${planning.opmerkingen ? `<p>📝 ${escapeHtml(planning.opmerkingen)}</p>` : ''}
                <span class="planning-status ${statusClass}">${getStatusText(planning.status)}</span>
            </div>
            <div class="planning-buttons">
                <select class="status-select" data-id="${planning.id}">
                    <option value="gepland" ${planning.status === 'gepland' ? 'selected' : ''}>Gepland</option>
                    <option value="uitgevoerd" ${planning.status === 'uitgevoerd' ? 'selected' : ''}>Uitgevoerd</option>
                    <option value="geannuleerd" ${planning.status === 'geannuleerd' ? 'selected' : ''}>Geannuleerd</option>
                </select>
                <button class="btn btn-secondary edit-planning-btn" data-id="${planning.id}">✏️</button>
                <button class="btn btn-danger delete-planning-btn" data-id="${planning.id}">🗑️</button>
            </div>
        `;
        planningLijst.appendChild(item);
    });
    
    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', (e) => updateStatus(e.target.dataset.id, e.target.value));
    });
    document.querySelectorAll('.edit-planning-btn').forEach(btn => {
        btn.addEventListener('click', () => bewerkPlanning(btn.dataset.id));
    });
    document.querySelectorAll('.delete-planning-btn').forEach(btn => {
        btn.addEventListener('click', () => verwijderPlanning(btn.dataset.id));
    });
}

async function updateStatus(id, nieuweStatus) {
    if (typeof window.supabaseClient === 'undefined') return;
    
    const { error } = await window.supabaseClient
        .from('planningen')
        .update({ status: nieuweStatus })
        .eq('id', id);
    
    if (error) {
        alert('Fout bij updaten status: ' + error.message);
    } else {
        laadPlanningen();
    }
}

if (newPlanningBtn) {
    newPlanningBtn.addEventListener('click', async () => {
        await laadInstellingen();
        vulInstellingDropdown();
        currentPlanningId = null;
        planningPopupTitle.textContent = 'Nieuwe planning';
        document.getElementById('typeSelect').value = 'ophaling';
        document.getElementById('planningDatum').value = '';
        document.getElementById('planningTijd').value = '';
        document.getElementById('opmerkingen').value = '';
        planningPopup.style.display = 'flex';
    });
}

async function bewerkPlanning(id) {
    await laadInstellingen();
    vulInstellingDropdown();
    
    if (typeof window.supabaseClient === 'undefined') return;
    
    const { data, error } = await window.supabaseClient
        .from('planningen')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) {
        alert('Fout bij laden: ' + error.message);
        return;
    }
    
    currentPlanningId = id;
    planningPopupTitle.textContent = 'Planning bewerken';
    instellingSelect.value = data.instelling_id;
    document.getElementById('typeSelect').value = data.type;
    document.getElementById('planningDatum').value = data.datum;
    document.getElementById('planningTijd').value = data.tijd;
    document.getElementById('opmerkingen').value = data.opmerkingen || '';
    planningPopup.style.display = 'flex';
}

if (savePlanningBtn) {
    savePlanningBtn.addEventListener('click', async () => {
        if (typeof window.supabaseClient === 'undefined') {
            alert('Supabase is niet beschikbaar');
            return;
        }
        
        const instellingId = instellingSelect?.value;
        const type = document.getElementById('typeSelect')?.value;
        const datum = document.getElementById('planningDatum')?.value;
        const tijd = document.getElementById('planningTijd')?.value;
        const opmerkingen = document.getElementById('opmerkingen')?.value;
        
        if (!instellingId || !type || !datum || !tijd) {
            alert('Vul alle verplichte velden in');
            return;
        }
        
        const planningData = {
            instelling_id: parseInt(instellingId),
            type: type,
            datum: datum,
            tijd: tijd,
            opmerkingen: opmerkingen || null,
            status: 'gepland'
        };
        
        let error;
        if (currentPlanningId) {
            const result = await window.supabaseClient
                .from('planningen')
                .update(planningData)
                .eq('id', currentPlanningId);
            error = result.error;
        } else {
            const result = await window.supabaseClient
                .from('planningen')
                .insert([planningData]);
            error = result.error;
        }
        
        if (error) {
            alert('Fout bij opslaan: ' + error.message);
        } else {
            planningPopup.style.display = 'none';
            laadPlanningen();
        }
    });
}

async function verwijderPlanning(id) {
    if (!confirm('Weet je zeker dat je deze planning wilt verwijderen?')) return;
    
    if (typeof window.supabaseClient === 'undefined') return;
    
    const { error } = await window.supabaseClient
        .from('planningen')
        .delete()
        .eq('id', id);
    
    if (error) {
        alert('Fout bij verwijderen: ' + error.message);
    } else {
        laadPlanningen();
    }
}

if (filterBtn) {
    filterBtn.addEventListener('click', laadPlanningen);
}

if (closePlanningPopup) {
    closePlanningPopup.addEventListener('click', () => {
        planningPopup.style.display = 'none';
    });
}

window.addEventListener('click', (e) => {
    if (e.target === planningPopup) {
        planningPopup.style.display = 'none';
    }
});

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL');
}

function getStatusText(status) {
    switch(status) {
        case 'gepland': return 'Gepland';
        case 'uitgevoerd': return 'Uitgevoerd';
        case 'geannuleerd': return 'Geannuleerd';
        default: return status;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function init() {
    await laadInstellingen();
    laadPlanningen();
}

init();