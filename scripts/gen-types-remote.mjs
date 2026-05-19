#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

// Read .env.local and find NEXT_PUBLIC_SUPABASE_URL
let envFile;
try {
  envFile = readFileSync('.env.local', 'utf8');
} catch {
  console.error('Could not read .env.local — copy .env.example and fill it in first.');
  process.exit(1);
}

const match = envFile.match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m);
if (!match) {
  console.error('NEXT_PUBLIC_SUPABASE_URL not found in .env.local');
  process.exit(1);
}

const url = match[1].trim().replace(/^["']|["']$/g, '');

// Extract project ref from https://<ref>.supabase.co
const refMatch = url.match(/https?:\/\/([^.]+)\.supabase\.co/);
if (!refMatch) {
  console.error(`Could not extract project ref from URL: ${url}`);
  console.error('(Local Supabase URLs work with `npm run types:generate` instead.)');
  process.exit(1);
}

const projectRef = refMatch[1];
console.log(`Generating types from project ${projectRef}...`);

execSync(
  `supabase gen types typescript --project-id ${projectRef} > lib/database.types.ts`,
  { stdio: 'inherit' }
);

console.log('✓ Types written to lib/database.types.ts');