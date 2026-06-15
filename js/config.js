// Supabase configuratie (vul jouw gegevens in)
const SUPABASE_URL = 'https://jcdqcgviossmrvlgsiqd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BhTGDyLsGeHEMConkTeqcg_LHK5pLoG';


// De Supabase client aanmaken (let op: supabase (zonder 'Js') is wat de CDN geeft)
window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('✅ Supabase client geladen!', window.supabase);