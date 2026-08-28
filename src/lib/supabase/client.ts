"use client";

import { createBrowserClient } from "@supabase/ssr";

import { readPublicEnv } from "@/config/env/public";

export function createSupabaseBrowserClient() {
  const environment = readPublicEnv();
  if (
    !environment.NEXT_PUBLIC_SUPABASE_URL ||
    !environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    throw new Error("Supabase Auth is not configured.");
  }

  return createBrowserClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
