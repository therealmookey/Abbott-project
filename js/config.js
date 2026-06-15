// Supabase configuratie (vul jouw gegevens in)
const SUPABASE_URL = 'https://jcdqcgviossmrvlgsiqd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BhTGDyLsGeHEMConkTeqcg_LHK5pLoG';


// Maak de Supabase client aan en stop hem in window (globaal beschikbaar)
window.supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Debug: check of het gelukt is
console.log('✅ Supabase client geladen!', window.supabase);