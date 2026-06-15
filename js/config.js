// Supabase configuratie (vul jouw gegevens in)
const SUPABASE_URL = 'https://jcdqcgviossmrvlgsiqd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BhTGDyLsGeHEMConkTeqcg_LHK5pLoG';


// Maak een werkende client aan (geen window.supabase.createClient maar direct)
const supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Controleer of het gelukt is (debug)
console.log('Supabase client geïnitialiseerd:', supabase);