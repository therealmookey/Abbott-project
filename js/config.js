// ===== SUPABASE CONFIGURATIE =====
const SUPABASE_URL = 'https://jcdqcgviossmrvlgsiqd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BhTGDyLsGeHEMConkTeqcg_LHK5pLoG';

// ===== OPENROUTER CONFIGURATIE =====
// LET OP: Vervang dit door je eigen key in een omgevingsvariabele!
// Voor nu: gebruik deze tijdelijke waarde, maar voeg nooit je echte key toe aan de code!
const OPENROUTER_API_KEY = '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';  // <-- Vervang met je eigen key, maar push dit niet!
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('✅ Supabase client geladen!');