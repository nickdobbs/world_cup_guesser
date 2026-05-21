import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logout } from '../auth/actions';
import { resetFixtures, savePredictions, simulateResults } from './actions';
import type { MockFixture, Prediction } from '@/lib/database.helpers';
import PersonaCard from './PersonaCard';

function scoreOne(fixture: MockFixture, prediction: Prediction | undefined): number {
  if (
    fixture.status !== 'finished' ||
    fixture.home_score === null ||
    fixture.away_score === null ||
    !prediction
  ) {
    return 0;
  }
  if (
    prediction.predicted_home_score === fixture.home_score &&
    prediction.predicted_away_score === fixture.away_score
  ) {
    return 3;
  }
  const actualOutcome = Math.sign(fixture.home_score - fixture.away_score);
  const predictedOutcome = Math.sign(
    prediction.predicted_home_score - prediction.predicted_away_score,
  );
  return actualOutcome === predictedOutcome ? 1 : 0;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { error, notice } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/dashboard');

  const { data: fixturesData } = await supabase
    .from('mock_fixtures')
    .select('*')
    .order('id', { ascending: true });
  const fixtures: MockFixture[] = fixturesData ?? [];

  const fixtureIds = fixtures.map((f) => f.id);
  const { data: predictionsData } = await supabase
    .from('predictions')
    .select('*')
    .in('fixture_id', fixtureIds);
  const predictions: Prediction[] = predictionsData ?? [];

  const predictionByFixture = new Map<string, Prediction>();
  for (const p of predictions) predictionByFixture.set(p.fixture_id, p);

  const finishedFixtures = fixtures.filter((f) => f.status === 'finished');
  const userPoints = fixtures.reduce(
    (sum, f) => sum + scoreOne(f, predictionByFixture.get(f.id)),
    0,
  );
  const maxPossible = finishedFixtures.length * 3;
  const rating =
    finishedFixtures.length === 0
      ? 5
      : Math.max(
          1,
          Math.min(10, 1 + Math.floor(9 * (userPoints / Math.max(1, maxPossible)))),
        );

  return (
    <div className="min-h-screen bg-white text-black">
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b-2 border-black bg-white px-6 py-4 md:px-12">
        <div className="text-2xl font-black tracking-tighter uppercase">
          WE ARE 26
        </div>
        <div className="hidden gap-8 md:flex">
          <span className="border-b-4 border-red-600 pb-1 text-xs font-bold uppercase tracking-widest text-red-600">
            Predictions
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
            Leaderboard
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
            Profile
          </span>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="border-2 border-black px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors hover:bg-black hover:text-white"
          >
            Sign out
          </button>
        </form>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-10 md:px-12">
        {error && (
          <p
            role="alert"
            className="mb-6 border-2 border-red-600 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          >
            {error}
          </p>
        )}

        {notice && !error && (
          <p
            role="status"
            className="mb-6 border-2 border-[#000080] bg-blue-50 px-4 py-3 text-sm font-semibold text-[#000080]"
          >
            {notice}
          </p>
        )}

        <PersonaCard
          rating={rating}
          userPoints={userPoints}
          maxPossible={maxPossible}
          finishedCount={finishedFixtures.length}
          fixtureCount={fixtures.length}
        />

        {/* Fixtures + Predictions form */}
        <section>
          <div className="mb-6 flex items-center justify-between border-b-2 border-black pb-4">
            <h2 className="text-3xl font-black uppercase tracking-tight md:text-4xl">
              Group Stage
            </h2>
            <span className="border-2 border-green-700 bg-green-700 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
              Matchday 1
            </span>
          </div>

          {fixtures.length === 0 ? (
            <p className="text-sm text-neutral-600">No fixtures available yet.</p>
          ) : (
            <form action={savePredictions} className="space-y-4">
              <div className="max-h-[600px] space-y-4 overflow-y-auto border-2 border-black bg-neutral-50 p-4">
                {fixtures.map((f, i) => {
                  const p = predictionByFixture.get(f.id);
                  const isFinished = f.status === 'finished';
                  const pts = scoreOne(f, p);
                  const accent =
                    i % 3 === 0
                      ? 'border-l-8 border-l-green-700'
                      : i % 3 === 1
                        ? 'border-l-8 border-l-[#000080]'
                        : 'border-l-8 border-l-red-600';
                  const rowBg = isFinished
                    ? 'bg-neutral-100 opacity-75'
                    : 'bg-white';
                  return (
                    <div
                      key={f.id}
                      className={`flex flex-col items-stretch gap-4 border-2 border-black p-5 md:flex-row md:items-center md:gap-6 ${accent} ${rowBg}`}
                      aria-disabled={isFinished}
                    >
                      <input type="hidden" name="fixture_id" value={f.id} />

                      <div
                        className={`flex-1 text-lg font-bold uppercase tracking-tight md:text-xl ${
                          isFinished ? 'text-neutral-500' : ''
                        }`}
                      >
                        {f.home_team}
                      </div>

                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="number"
                          name={`home_${f.id}`}
                          min={0}
                          max={20}
                          defaultValue={p?.predicted_home_score ?? ''}
                          placeholder="0"
                          disabled={isFinished}
                          className="h-16 w-16 border-2 border-black bg-white text-center text-2xl font-black focus:border-4 focus:border-green-700 focus:outline-none disabled:cursor-not-allowed disabled:border-neutral-400 disabled:bg-neutral-200 disabled:text-neutral-500 md:h-20 md:w-20 md:text-3xl"
                        />
                        <span
                          className={`text-xl font-black ${
                            isFinished ? 'text-neutral-500' : ''
                          }`}
                        >
                          :
                        </span>
                        <input
                          type="number"
                          name={`away_${f.id}`}
                          min={0}
                          max={20}
                          defaultValue={p?.predicted_away_score ?? ''}
                          placeholder="0"
                          disabled={isFinished}
                          className="h-16 w-16 border-2 border-black bg-white text-center text-2xl font-black focus:border-4 focus:border-green-700 focus:outline-none disabled:cursor-not-allowed disabled:border-neutral-400 disabled:bg-neutral-200 disabled:text-neutral-500 md:h-20 md:w-20 md:text-3xl"
                        />
                      </div>

                      <div
                        className={`flex-1 text-right text-lg font-bold uppercase tracking-tight md:text-xl ${
                          isFinished ? 'text-neutral-500' : ''
                        }`}
                      >
                        {f.away_team}
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1 md:w-32 md:items-end">
                        {isFinished ? (
                          <>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                              Final
                            </span>
                            <span className="text-lg font-black">
                              {f.home_score} – {f.away_score}
                            </span>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white ${
                                pts === 3
                                  ? 'bg-green-700'
                                  : pts === 1
                                    ? 'bg-[#000080]'
                                    : 'bg-neutral-400'
                              }`}
                            >
                              {pts} pt{pts === 1 ? '' : 's'}
                            </span>
                          </>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-2">
                <button
                  type="submit"
                  className="w-full bg-red-600 py-5 text-sm font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-90"
                >
                  Lock In Predictions
                </button>
              </div>
            </form>
          )}

          {/* Separate forms so demo buttons don't submit the predictions form */}
          <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2">
            <form action={simulateResults}>
              <button
                type="submit"
                className="w-full border-2 border-black bg-white py-5 text-sm font-bold uppercase tracking-widest text-black transition-colors hover:bg-black hover:text-white"
              >
                Simulate Results (Time Machine)
              </button>
            </form>
            <form action={resetFixtures}>
              <button
                type="submit"
                className="w-full border-2 border-[#000080] bg-white py-5 text-sm font-bold uppercase tracking-widest text-[#000080] transition-colors hover:bg-[#000080] hover:text-white"
              >
                Reset Demo Data
              </button>
            </form>
          </div>
        </section>

        <footer className="mt-16 border-t-2 border-[#000080] py-6 text-center text-[10px] font-bold uppercase tracking-widest text-neutral-500">
          © 2026 We Are 26 · Signed in as {user.email}
        </footer>
      </main>
    </div>
  );
}
