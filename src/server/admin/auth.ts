import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSqlClient } from "@/server/db/client";

import type { AdminRole } from "./permissions";

export type AdminSession = Readonly<{
  authenticatedAt: Date;
  email: string;
  role: AdminRole;
  userId: string;
}>;

type AdminSessionResult =
  | Readonly<{ kind: "authenticated"; session: AdminSession }>
  | Readonly<{ kind: "forbidden" | "mfa_required" | "reauth_required" }>;

const readAdminSession = cache(async (): Promise<AdminSessionResult> => {
  try {
    const supabase = await createSupabaseServerClient();
    const [{ data: userData }, assurance, claimsResult] = await Promise.all([
      supabase.auth.getUser(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.getClaims(),
    ]);
    const user = userData.user;
    if (!user?.email || !user.email_confirmed_at) return { kind: "forbidden" };
    const [admin] = await getSqlClient()<
      { is_active: boolean; role: AdminRole }[]
    >`
      SELECT role, is_active FROM private.admin_users
      WHERE user_id = ${user.id} AND is_active = true AND revoked_at IS NULL
      LIMIT 1
    `;
    if (!admin) return { kind: "forbidden" };
    if (
      assurance.error ||
      assurance.data.currentLevel !== "aal2" ||
      assurance.data.nextLevel !== "aal2"
    ) {
      return { kind: "mfa_required" };
    }
    const issuedAt = claimsResult.data?.claims.iat;
    if (typeof issuedAt !== "number") return { kind: "reauth_required" };
    return {
      kind: "authenticated",
      session: {
        authenticatedAt: new Date(issuedAt * 1_000),
        email: user.email.toLowerCase(),
        role: admin.role,
        userId: user.id,
      },
    };
  } catch {
    return { kind: "forbidden" };
  }
});

export async function getAdminSession(input?: { requireRecent?: boolean }) {
  const result = await readAdminSession();
  if (
    result.kind === "authenticated" &&
    input?.requireRecent &&
    Date.now() - result.session.authenticatedAt.getTime() > 30 * 60_000
  ) {
    return { kind: "reauth_required" } as const;
  }
  return result;
}
