'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';

// Resolve the site URL for redirects.
// Priority: explicit env var → request origin → localhost fallback.
// In production NEXT_PUBLIC_SITE_URL should always be set.
async function getOrigin() {
  if (env.siteUrl) return env.siteUrl;
  const h = await headers();
  return h.get('origin') ?? 'http://localhost:3000';
}

function sanitizeNext(next: string): string {
  if (!next) return '/';
  if (!next.startsWith('/') || next.startsWith('//')) return '/';
  if (next.includes(':')) return '/';
  return next;
}

// -----------------------------------------------------------------------------
// Email + password login
// -----------------------------------------------------------------------------

export async function loginWithPassword(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const next = sanitizeNext(String(formData.get('next') ?? ''));

  if (!email || !password) {
    redirect('/auth/login?error=' + encodeURIComponent('Email and password are required'));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect('/auth/login?error=' + encodeURIComponent(error.message));
  }

  revalidatePath('/', 'layout');
  redirect(next);
}

// -----------------------------------------------------------------------------
// Email + password signup
// -----------------------------------------------------------------------------

export async function signupWithPassword(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const fullName = String(formData.get('full_name') ?? '');

  if (!email || !password) {
    redirect('/auth/signup?error=' + encodeURIComponent('Email and password are required'));
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: { full_name: fullName },
    },
  });

  if (error) {
    redirect('/auth/signup?error=' + encodeURIComponent(error.message));
  }

  // Supabase has sent a confirmation email. The user needs to click the
  // link before they can sign in. Send them to a landing page that says so.
  redirect('/auth/check-email');
}

// -----------------------------------------------------------------------------
// Logout
// -----------------------------------------------------------------------------

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/auth/login');
}