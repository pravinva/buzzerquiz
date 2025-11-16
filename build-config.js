#!/usr/bin/env node
// Build script to generate config.js from environment variables
// Run this during Vercel build: node build-config.js

const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

const configContent = `// Auto-generated config (do not edit manually)
// Generated from environment variables during build

window.SUPABASE_URL = '${supabaseUrl}';
window.SUPABASE_ANON_KEY = '${supabaseAnonKey}';
`;

const outputPath = path.join(__dirname, 'public', 'config.generated.js');
fs.writeFileSync(outputPath, configContent);

console.log('✓ Generated config from environment variables');
console.log('  SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
console.log('  SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Set' : '✗ Missing');
