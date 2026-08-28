import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { readPublicEnv } from "@/config/env/public";

export function isSupabaseAuthConfigured(): boolean {
  const environment = readPublicEnv();
  return Boolean(
    environment.NEXT_PUBLIC_SUPABASE_URL &&
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export async function createSupabaseServerClient() {
  const environment = readPublicEnv();
  if (
    !environment.NEXT_PUBLIC_SUPABASE_URL ||
    !environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    throw new Error("Supabase Auth is not configured.");
  }

  const cookieStore = await cookies();
  return createServerClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            for (const { name, options, value } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot write cookies. The request proxy refreshes
            // them before rendering; Route Handlers and Server Actions can write.
          }
        },
      },
    },
  );
}
