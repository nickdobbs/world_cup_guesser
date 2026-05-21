'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { env, getServerEnv } from '@/lib/env';
import type { Database } from '@/lib/database.types';

const FIXTURE_BATCH_SIZE = 5;

function fail(message: string): never {
  redirect('/dashboard?error=' + encodeURIComponent(message));
}

function done(message: string): never {
  redirect('/dashboard?notice=' + encodeURIComponent(message));
}

export async function savePredictions(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/dashboard');

  const fixtureIds = formData.getAll('fixture_id').map(String);
  if (fixtureIds.length === 0) fail('No fixtures submitted');

  const rows = [];
  for (const fixtureId of fixtureIds) {
    const home = formData.get(`home_${fixtureId}`);
    const away = formData.get(`away_${fixtureId}`);
    // Skip empty inputs so users can save partial predictions.
    if (home === '' || home === null || away === '' || away === null) continue;
    const homeNum = Number(home);
    const awayNum = Number(away);
    if (!Number.isInteger(homeNum) || !Number.isInteger(awayNum)) {
      fail('Scores must be whole numbers');
    }
    if (homeNum < 0 || awayNum < 0) fail('Scores cannot be negative');
    rows.push({
      user_id: user.id,
      fixture_id: fixtureId,
      predicted_home_score: homeNum,
      predicted_away_score: awayNum,
    });
  }

  // Replace this user's predictions for these fixtures. There's no unique
  // constraint on (user_id, fixture_id) so we can't use upsert.
  const { error: delError } = await supabase
    .from('predictions')
    .delete()
    .in('fixture_id', fixtureIds);
  if (delError) fail(delError.message);

  if (rows.length > 0) {
    const { error: insError } = await supabase.from('predictions').insert(rows);
    if (insError) fail(insError.message);
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}

export async function simulateResults() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/dashboard');

  // mock_fixtures is reference data with no user-write RLS policy, so use a
  // service-role client (server-only) to mutate it. We still gated the action
  // behind getUser() above.
  const { supabaseSecretKey } = getServerEnv();
  const admin = createSupabaseAdmin<Database>(env.supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: fixtures, error: fetchError } = await admin
    .from('mock_fixtures')
    .select('id')
    .eq('status', 'pending')
    .order('id', { ascending: true })
    .limit(FIXTURE_BATCH_SIZE);
  if (fetchError) fail(fetchError.message);
  if (!fixtures || fixtures.length === 0) {
    done('No pending fixtures left to simulate. Hit Reset Demo Data to start over.');
  }

  for (const f of fixtures) {
    const homeScore = Math.floor(Math.random() * 5);
    const awayScore = Math.floor(Math.random() * 5);
    const { error: updError } = await admin
      .from('mock_fixtures')
      .update({
        home_score: homeScore,
        away_score: awayScore,
        status: 'finished',
      })
      .eq('id', f.id);
    if (updError) fail(updError.message);
  }

  revalidatePath('/dashboard');
  done(`Simulated ${fixtures.length} fixture${fixtures.length === 1 ? '' : 's'}.`);
}

export async function resetFixtures() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/dashboard');

  // mock_fixtures has no user-write RLS policy and we want to wipe predictions
  // for ALL users (demo reset), so use the service-role client.
  const { supabaseSecretKey } = getServerEnv();
  const admin = createSupabaseAdmin<Database>(env.supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Wipe every prediction. Supabase requires a filter on delete, so use a
  // condition that matches every row.
  const { error: delPredError } = await admin
    .from('predictions')
    .delete()
    .not('id', 'is', null);
  if (delPredError) fail(`Failed to clear predictions: ${delPredError.message}`);

  // Reset every fixture back to pending with no score.
  const { error: updError } = await admin
    .from('mock_fixtures')
    .update({
      home_score: null,
      away_score: null,
      status: 'pending',
    })
    .not('id', 'is', null);
  if (updError) fail(`Failed to reset fixtures: ${updError.message}`);

  revalidatePath('/dashboard');
  done('Demo data reset. All fixtures are pending again.');
}
