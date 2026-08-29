import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnvSchema, resolvePublicSiteUrl } from "@/config/env/public";

export async function refreshSupabaseSession(request: NextRequest) {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SITE_URL: resolvePublicSiteUrl(
      process.env.NEXT_PUBLIC_SITE_URL,
      process.env.NEXT_PUBLIC_VERCEL_URL,
    ),
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  });
  if (
    !parsed.success ||
    !parsed.data.NEXT_PUBLIC_SUPABASE_URL ||
    !parsed.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    parsed.data.NEXT_PUBLIC_SUPABASE_URL,
    parsed.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, options, value } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // This verified call initializes and refreshes the cookie-backed session.
  // Authorization remains in the data-access layer, never in Proxy.
  await supabase.auth.getClaims();
  return response;
}
