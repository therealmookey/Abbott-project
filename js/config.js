// Supabase configuratie (vul jouw gegevens in)
const SUPABASE_URL = 'https://jcdqcgviossmrvlgsiqd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BhTGDyLsGeHEMConkTeqcg_LHK5pLoG';

// ===== OPENROUTER CONFIGURATIE (Tijdelijk voor testen!) =====
const OPENROUTER_API_KEY = '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';  // <-- Plak hier jouw key
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';


// De Supabase client aanmaken (let op: supabase (zonder 'Js') is wat de CDN geeft)
window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('✅ Supabase client geladen!', window.supabase);