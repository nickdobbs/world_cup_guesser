#!/usr/bin/env node
// One-off seed: replace mock_fixtures rows with real WC2026 fixtures.
//
// Hits the upstream API exactly once (single GET to /api/matches). The
// upstream proxy caches for 24h and has a 100 req/day limit — do not run
// this in a loop or call it from the frontend. Run manually when you
// genuinely need to refresh fixtures.
//
// Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const API_URL = 'https://world-cup-api.vercel.app/api/matches';
// Cache the raw API response so re-runs (e.g. after a DB error) don't
// burn another call against the 100 req/day proxy limit. Delete this
// file to force a refresh.
const CACHE_PATH = 'scripts/.seed-api-cache.json';

// Parse .env.local without pulling in dotenv. Matches the style of
// scripts/gen-types-remote.mjs.
let envFile;
try {
  envFile = readFileSync('.env.local', 'utf8');
} catch {
  console.error('Could not read .env.local — copy .env.example and fill it in first.');
  process.exit(1);
}

function readEnv(name) {
  const m = envFile.match(new RegExp(`^${name}=(.+)$`, 'm'));
  if (!m) return null;
  return m[1].trim().replace(/^["']|["']$/g, '');
}

const supabaseUrl = readEnv('NEXT_PUBLIC_SUPABASE_URL');
const secretKey = readEnv('SUPABASE_SECRET_KEY');

if (!supabaseUrl || !secretKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let matches;
if (existsSync(CACHE_PATH)) {
  console.log(`Using cached response from ${CACHE_PATH}.`);
  matches = JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
} else {
  console.log(`Fetching fixtures from ${API_URL} ...`);
  const res = await fetch(API_URL);
  if (!res.ok) {
    console.error(`API returned ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
  matches = await res.json();
  writeFileSync(CACHE_PATH, JSON.stringify(matches));
}

if (!Array.isArray(matches) || matches.length === 0) {
  console.error('API returned an empty or unexpected payload.');
  process.exit(1);
}

console.log(`Got ${matches.length} matches from API.`);

// Knockout-bracket placeholders have null team names until the prior
// round resolves. Drop them — there's nothing to predict yet, and our
// schema requires NOT NULL on the team columns.
const playable = matches.filter((m) => m.home_team && m.away_team);
console.log(`${playable.length} have both teams known (dropping ${matches.length - playable.length} bracket placeholders).`);

const rows = playable.map((m) => ({
  home_team: m.home_team,
  away_team: m.away_team,
  home_score: null,
  away_score: null,
  status: 'pending',
}));

// Wipe existing rows. predictions has ON DELETE CASCADE on fixture_id,
// so any test predictions tied to old seed rows will be removed too.
console.log('Deleting existing mock_fixtures rows ...');
const { error: delError, count: deletedCount } = await supabase
  .from('mock_fixtures')
  .delete({ count: 'exact' })
  .not('id', 'is', null);

if (delError) {
  console.error('Delete failed:', delError);
  process.exit(1);
}
console.log(`Deleted ${deletedCount ?? 'unknown'} existing rows.`);

console.log(`Inserting ${rows.length} new rows ...`);
const { error: insError, count: insertedCount } = await supabase
  .from('mock_fixtures')
  .insert(rows, { count: 'exact' });

if (insError) {
  console.error('Insert failed:', insError);
  process.exit(1);
}

console.log(`Inserted ${insertedCount ?? rows.length} rows. Done.`);
