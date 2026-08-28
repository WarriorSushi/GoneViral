import "server-only";

import { cache } from "react";

import {
  createSupabaseServerClient,
  isSupabaseAuthConfigured,
} from "@/lib/supabase/server";

import { canonicalizeOwnerEmail } from "./claim-owner";

export type VerifiedAuthUser = Readonly<{ email: string; id: string }>;

export const getVerifiedAuthUser = cache(
  async (): Promise<VerifiedAuthUser | null> => {
    if (!isSupabaseAuthConfigured()) return null;
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    const user = data.user;
    if (error || !user?.email || !user.email_confirmed_at) return null;
    return { email: canonicalizeOwnerEmail(user.email), id: user.id };
  },
);
