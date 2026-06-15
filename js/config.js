// Supabase configuratie (vul jouw gegevens in)
const SUPABASE_URL = 'https://jcdqcgviossmrvlgsiqd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BhTGDyLsGeHEMConkTeqcg_LHK5pLoG';


// Gebruik een andere naam om conflicten te voorkomen
window.supabaseClient = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('✅ Supabase client geladen!');