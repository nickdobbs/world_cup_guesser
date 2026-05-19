import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // The "next" param lets us return users to where they were trying to go.
  // We default to the home page if not provided.
  const next = sanitizeNext(searchParams.get('next'));

  // The provider can send error params if the user cancelled, denied access,
  // or something failed upstream. Show them on the login page.
  if (errorParam) {
    const message = errorDescription ?? errorParam;
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(message)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent('Missing authorization code')}`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(error.message)}`
    );
  }

  // Session is now set via cookies. Send them to where they were going.
  // We use the request's origin rather than env.siteUrl so behind-the-scenes
  // proxies (Vercel preview URLs, custom domains) work correctly.
  return NextResponse.redirect(`${origin}${next}`);
}

/**
 * Validate the `next` redirect target.
 *
 * Open redirect vulnerabilities happen when an app blindly redirects to a URL
 * supplied by the user. An attacker can craft a link like
 * `/auth/callback?code=...&next=https://evil.com` and use your trusted domain
 * to phish the victim. Restrict to same-origin paths only.
 */
function sanitizeNext(next: string | null): string {
  if (!next) return '/';
  // Must start with `/` and not `//` (which would be a protocol-relative URL).
  if (!next.startsWith('/') || next.startsWith('//')) return '/';
  // Reject anything containing a scheme.
  if (next.includes(':')) return '/';
  return next;
}