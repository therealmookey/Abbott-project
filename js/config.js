// Supabase configuratie (vul jouw gegevens in)
const SUPABASE_URL = 'https://jcdqcgviossmrvlgsiqd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BhTGDyLsGeHEMConkTeqcg_LHK5pLoG';


// Maak de Supabase client direct aan
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Zet hem globaal zodat andere bestanden hem kunnen gebruiken
window.supabase = supabase;

console.log('✅ Supabase client geladen!');