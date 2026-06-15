// ===== CHAUFFEURS FUNCTIES (VOOR GEBRUIKERS) =====

console.log('chauffeurs.js geladen');

document.addEventListener('DOMContentLoaded', async function() {
    
    if (!window.supabase) {
        console.error('Supabase niet beschikbaar!');
        return;
    }
    
    // Controleer of gebruiker is ingelogd
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    // DOM elementen
    const chauffeursLijst = document.getElementById('chauffeursLijst');
    const addChauffeurBtn = document.getElementById('addChauffeurBtn');
    const chauffeurPopup = document.getElementById('chauffeurPopup');
    const saveChauffeurBtn = document.getElementById('saveChauffeurBtn');
    const closeChauffeurPopup = document.getElementById('closeChauffeurPopup');
    const popupTitle = document.getElementById('popupTitle');
    
    let currentChauffeurId = null;
    
    function getValue(id) {
        const el = document.getElementById(id);
        return el ? el.value : '';
    }
    
    function setValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    }
    
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Laad alle chauffeurs
    async function laadChauffeurs() {
        if (!chauffeursLijst) return;
        
        chauffeursLijst.innerHTML = '<p>Bezig met laden...</p>';
        
        try {
            const { data, error } = await window.supabase
                .from('chauffeurs')
                .select('*')
                .order('chauffeursnummer', { ascending: true });
            
            if (error) throw error;
            
            if (!data || data.length === 0) {
                chauffeursLijst.innerHTML = '<p>Geen chauffeurs gevonden. Klik op "+ Nieuwe chauffeur" om er een toe te voegen.</p>';
                return;
            }
            
            let html = `
                <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #f8f9fa;">
                            <th style="padding: 12px; text-align: left;">Nummer</th>
                            <th style="padding: 12px; text-align: left;">Naam</th>
                            <th style="padding: 12px; text-align: left;">Telefoon</th>
                            <th style="padding: 12px; text-align: left;">WhatsApp</th>
                            <th style="padding: 12px; text-align: left;">E-mail</th>
                            <th style="padding: 12px; text-align: left;">Acties</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            for (const chauffeur of data) {
                html += `
                    <tr style="border-bottom: 1px solid #e9ecef;">
                        <td style="padding: 12px;"><strong>${escapeHtml(chauffeur.chauffeursnummer)}</strong></td>
                        <td style="padding: 12px;">${escapeHtml(chauffeur.naam)}</td>
                        <td style="padding: 12px;">${escapeHtml(chauffeur.telefoon || '-')}</td>
                        <td style="padding: 12px;">${escapeHtml(chauffeur.whatsapp || chauffeur.telefoon || '-')}</td>
                        <td style="padding: 12px;">${escapeHtml(chauffeur.email || '-')}</td>
                        <td style="padding: 12px;">
                            <button class="btn btn-secondary edit-btn" data-id="${chauffeur.id}">✏️ Bewerken</button>
                            <button class="btn btn-danger delete-btn" data-id="${chauffeur.id}">🗑️ Verwijderen</button>
                        </td>
                    </tr>
                `;
            }
            
            html += `
                    </tbody>
                </table>
                </div>
            `;
            
            chauffeursLijst.innerHTML = html;
            
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', () => bewerkChauffeur(btn.dataset.id));
            });
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', () => verwijderChauffeur(btn.dataset.id));
            });
            
        } catch (err) {
            console.error('Fout:', err);
            chauffeursLijst.innerHTML = `<p class="error">Fout: ${err.message}</p>`;
        }
    }
    
    // Nieuwe chauffeur
    if (addChauffeurBtn) {
        addChauffeurBtn.addEventListener('click', () => {
            currentChauffeurId = null;
            popupTitle.textContent = 'Nieuwe chauffeur';
            setValue('chauffeursnummer', '');
            setValue('naam', '');
            setValue('telefoon', '');
            setValue('email', '');
            setValue('whatsapp', '');
            chauffeurPopup.style.display = 'flex';
        });
    }
    
    // Bewerk chauffeur
    async function bewerkChauffeur(id) {
        try {
            const { data, error } = await window.supabase
                .from('chauffeurs')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            
            currentChauffeurId = id;
            popupTitle.textContent = 'Chauffeur bewerken';
            setValue('chauffeursnummer', data.chauffeursnummer);
            setValue('naam', data.naam);
            setValue('telefoon', data.telefoon || '');
            setValue('email', data.email || '');
            setValue('whatsapp', data.whatsapp || '');
            chauffeurPopup.style.display = 'flex';
            
        } catch (err) {
            alert('Fout bij laden: ' + err.message);
        }
    }
    
    // Opslaan chauffeur
    if (saveChauffeurBtn) {
        saveChauffeurBtn.addEventListener('click', async () => {
            const chauffeursnummer = getValue('chauffeursnummer');
            const naam = getValue('naam');
            const telefoon = getValue('telefoon');
            const email = getValue('email');
            const whatsapp = getValue('whatsapp');
            
            if (!chauffeursnummer || !naam) {
                alert('Chauffeursnummer en naam zijn verplicht');
                return;
            }
            
            const chauffeurData = {
                chauffeursnummer: chauffeursnummer,
                naam: naam,
                telefoon: telefoon || null,
                email: email || null,
                whatsapp: whatsapp || null
            };
            
            try {
                let error;
                if (currentChauffeurId) {
                    const result = await window.supabase
                        .from('chauffeurs')
                        .update(chauffeurData)
                        .eq('id', currentChauffeurId);
                    error = result.error;
                } else {
                    const result = await window.supabase
                        .from('chauffeurs')
                        .insert([chauffeurData]);
                    error = result.error;
                }
                
                if (error) throw error;
                
                alert(currentChauffeurId ? 'Chauffeur bijgewerkt!' : 'Chauffeur toegevoegd!');
                chauffeurPopup.style.display = 'none';
                laadChauffeurs();
                
            } catch (err) {
                alert('Fout: ' + err.message);
            }
        });
    }
    
    // Verwijder chauffeur
    async function verwijderChauffeur(id) {
        if (!confirm('Weet je zeker dat je deze chauffeur wilt verwijderen?')) return;
        
        try {
            const { error } = await window.supabase
                .from('chauffeurs')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            alert('Chauffeur verwijderd');
            laadChauffeurs();
            
        } catch (err) {
            alert('Fout: ' + err.message);
        }
    }
    
    // Popup sluiten
    if (closeChauffeurPopup) {
        closeChauffeurPopup.addEventListener('click', () => {
            chauffeurPopup.style.display = 'none';
        });
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === chauffeurPopup) {
            chauffeurPopup.style.display = 'none';
        }
    });
    
    // Initialiseer
    laadChauffeurs();
    
});