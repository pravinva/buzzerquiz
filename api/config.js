// Vercel Serverless Function to serve Supabase config
// This keeps your keys on the server side

export default function handler(req, res) {
  // Set CORS headers to allow your frontend to access this
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'application/json');

  // Return Supabase config from Vercel environment variables
  res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
  });
}
