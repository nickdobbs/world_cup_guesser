// EXAMPLE — replace with your actual dashboard.
// Demonstrates: protected route, fetching user-owned data, RLS-enforced
// queries, server actions, logout.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logout } from '../auth/actions';
import { createNote, deleteNote } from './actions';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?next=/dashboard');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, full_name, avatar_url')
    .eq('id', user.id)
    .single();

  const { data: notes } = await supabase
    .from('notes')
    .select('id, title, body, created_at')
    .order('created_at', { ascending: false });

  const inputClass =
    'block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/20';
  const labelClass =
    'block text-sm font-medium text-zinc-700 dark:text-zinc-300';
  const primaryBtn =
    'inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200';
  const secondaryBtn =
    'inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800';

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Dashboard
        </h1>
        <form action={logout}>
          <button type="submit" className={secondaryBtn}>
            Sign out
          </button>
        </form>
      </header>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </p>
      )}

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Your account
        </h2>
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="font-medium text-zinc-700 dark:text-zinc-300">Email:</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">{user.email}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium text-zinc-700 dark:text-zinc-300">Name:</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">
              {profile?.full_name ?? '—'}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
          User ID: {user.id}
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          New note
        </h2>
        <form action={createNote} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="title" className={labelClass}>
              Title
            </label>
            <input
              id="title"
              type="text"
              name="title"
              required
              maxLength={200}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="body" className={labelClass}>
              Body <span className="text-zinc-400">(optional)</span>
            </label>
            <textarea
              id="body"
              name="body"
              rows={3}
              className={inputClass}
            />
          </div>
          <button type="submit" className={primaryBtn}>
            Add note
          </button>
        </form>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Your notes ({notes?.length ?? 0})
        </h2>
        {notes && notes.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {notes.map((note) => (
              <li
                key={note.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="min-w-0">
                  <strong className="block text-zinc-900 dark:text-zinc-100">
                    {note.title}
                  </strong>
                  {note.body && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                      {note.body}
                    </p>
                  )}
                  <small className="mt-2 block text-xs text-zinc-500 dark:text-zinc-500">
                    {new Date(note.created_at).toLocaleString()}
                  </small>
                </div>
                <form action={deleteNote}>
                  <input type="hidden" name="id" value={note.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-transparent px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                  >
                    Delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            No notes yet. Add one above.
          </p>
        )}
      </section>
    </main>
  );
}
