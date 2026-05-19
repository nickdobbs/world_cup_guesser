import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import type { Database } from "@/lib/database.types";

// Path prefixes that don't require authentication.
// Anything not matching these will be gated by the redirect below.
const PUBLIC_PATHS = ["/auth", "/_next", "/favicon.ico", "/api/public"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((prefix) => pathname.startsWith(prefix));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.supabaseUrl,
    env.supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: Do not run code between createServerClient and getUser().
  // A small thing can cause hard-to-debug issues with users randomly
  // getting logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    const intendedPath = url.pathname + url.search;
    url.pathname = "/auth/login";
    url.search = `?next=${encodeURIComponent(intendedPath)}`;

    // IMPORTANT: copy cookies from supabaseResponse onto the redirect,
    // otherwise any refreshed session tokens are lost.
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  }

  // IMPORTANT: You *must* return the supabaseResponse object as-is.
  // If you create a new NextResponse here, the refreshed cookies
  // won't flow back to the browser and sessions will silently break.

  return supabaseResponse;
}
