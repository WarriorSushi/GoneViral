import "server-only";

import { createClient } from "@supabase/supabase-js";

import { readPublicEnv } from "@/config/env/public";
import { readServerEnv } from "@/config/env/server";

export function createSupabaseAdminClient() {
  const url = readPublicEnv().NEXT_PUBLIC_SUPABASE_URL;
  const key = readServerEnv().SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase Storage is not configured.");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
