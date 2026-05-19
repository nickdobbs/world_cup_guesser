'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function createNote(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();

  if (!title) {
    redirect('/dashboard?error=' + encodeURIComponent('Title is required'));
  }

  const supabase = await createClient();

  // Re-verify auth in the action. Never trust that the form was rendered
  // for an authenticated user — actions can be called by anyone with a CSRF
  // token, so always check.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?next=/dashboard');
  }

  const { error } = await supabase.from('notes').insert({
    user_id: user.id,
    title,
    body: body || null,
  });

  if (error) {
    redirect('/dashboard?error=' + encodeURIComponent(error.message));
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}

export async function deleteNote(formData: FormData) {
  const id = String(formData.get('id') ?? '');

  if (!id) {
    redirect('/dashboard?error=' + encodeURIComponent('Note ID is required'));
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?next=/dashboard');
  }

  // We don't need a .eq('user_id', user.id) filter here because the RLS
  // policy already restricts deletes to the user's own rows. If someone
  // submits another user's note ID, the delete returns zero rows affected
  // and no row is touched. RLS is the real protection.
  const { error } = await supabase.from('notes').delete().eq('id', id);

  if (error) {
    redirect('/dashboard?error=' + encodeURIComponent(error.message));
  }

  revalidatePath('/dashboard');
}