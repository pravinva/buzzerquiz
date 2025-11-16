// Configuration for production (Vercel)
// Reads from environment variables injected at build time

// For Vercel: Set these in your project settings
// For local: Uses config.local.js (gitignored)

window.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || window.SUPABASE_URL || '';
window.SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY || '';
