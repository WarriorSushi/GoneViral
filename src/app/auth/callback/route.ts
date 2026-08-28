import { NextResponse, type NextRequest } from "next/server";

import { readPublicEnv } from "@/config/env/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { claimPendingListingsForVerifiedUser } from "@/server/auth/claim-owner";
import { safeManageRedirect } from "@/server/auth/redirect";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeManageRedirect(request.nextUrl.searchParams.get("next"));
  const destination = new URL(next, readPublicEnv().NEXT_PUBLIC_SITE_URL);

  if (!code) {
    destination.searchParams.set("error", "auth");
    return NextResponse.redirect(destination);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;

    const { data, error: userError } = await supabase.auth.getUser();
    const user = data.user;
    if (userError || !user?.email || !user.email_confirmed_at) {
      throw userError ?? new Error("Verified email is required.");
    }
    await claimPendingListingsForVerifiedUser({
      email: user.email,
      userId: user.id,
    });
    destination.searchParams.set("claimed", "1");
  } catch {
    destination.searchParams.set("error", "auth");
  }

  return NextResponse.redirect(destination);
}
