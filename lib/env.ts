// Client-safe env vars (NEXT_PUBLIC_*) — available in both contexts.
// Direct property access required for Next.js build-time inlining to work.
const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

if (!NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error(
    'Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL. ' +
    'Copy .env.example to .env.local and fill in the values.'
  );
}

if (!NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    'Missing required environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. ' +
    'Copy .env.example to .env.local and fill in the values.'
  );
}

export const env = {
  supabaseUrl: NEXT_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  siteUrl: NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
};

// Server-only secret key, accessed via a function so it's never bundled
// into client code. Throws if called from the browser.
export function getServerEnv() {
  if (typeof window !== 'undefined') {
    throw new Error('getServerEnv() must not be called from client code');
  }

  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      'Missing required environment variable: SUPABASE_SECRET_KEY. ' +
      'Copy .env.example to .env.local and fill in the values.'
    );
  }

  return {
    supabaseSecretKey: secretKey,
  };
}