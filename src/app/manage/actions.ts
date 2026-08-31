"use server";

import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { readPublicEnv } from "@/config/env/public";
import {
  createSupabaseServerClient,
  isSupabaseAuthConfigured,
} from "@/lib/supabase/server";
import { canonicalizeOwnerEmail } from "@/server/auth/claim-owner";
import {
  buildManageCallbackUrl,
  safeManageRedirect,
} from "@/server/auth/redirect";
import { getSqlClient } from "@/server/db/client";
import { submissionDigest } from "@/server/security/submission-security";

import {
  GENERIC_MANAGE_LINK_MESSAGE,
  type ManageLinkState,
} from "./manage-link-state";

function isEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function consumeManageRateLimit(
  email: string,
  remoteIp: string,
): Promise<boolean> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const policies = [
    { limit: 5n, scope: "manage_ip", seconds: 900, value: remoteIp },
    { limit: 3n, scope: "manage_email", seconds: 3600, value: email },
  ] as const;
  for (const policy of policies) {
    const windowStartSeconds =
      Math.floor(nowSeconds / policy.seconds) * policy.seconds;
    const rows = await getSqlClient()<[{ count: bigint }]>`
      INSERT INTO private.rate_limit_buckets (
        scope, subject_hmac, window_start, count, expires_at
      ) VALUES (
        ${policy.scope}, ${submissionDigest(policy.value)},
        ${new Date(windowStartSeconds * 1000).toISOString()}, 1,
        ${new Date((windowStartSeconds + policy.seconds * 2) * 1000).toISOString()}
      )
      ON CONFLICT (scope, subject_hmac, window_start)
      DO UPDATE SET count = private.rate_limit_buckets.count + 1
      RETURNING count
    `;
    if ((rows[0]?.count ?? policy.limit + 1n) > policy.limit) return false;
  }
  return true;
}

async function hasManageableListing(email: string): Promise<boolean> {
  const rows = await getSqlClient()<[{ present: boolean }]>`
    SELECT EXISTS (
      SELECT 1
      FROM private.pending_listing_owners AS pending
      JOIN private.payment_attempts AS attempt
        ON attempt.id = pending.created_from_attempt_id
       AND attempt.pending_owner_id = pending.id
       AND attempt.state = 'succeeded'
      WHERE pending.email_hash = ${submissionDigest(email)}
        AND pending.canonical_email = ${email}
        AND pending.claim_state IN ('pending', 'claimed')
    ) AS present
  `;
  return rows[0]?.present ?? false;
}

export async function requestManageLink(
  _state: ManageLinkState,
  formData: FormData,
): Promise<ManageLinkState> {
  const startedAt = Date.now();
  const rawEmail = formData.get("email");
  const email = canonicalizeOwnerEmail(
    typeof rawEmail === "string" ? rawEmail : "",
  );
  if (!isEmail(email)) return { fieldError: "Enter a valid email address." };

  try {
    const requestHeaders = await headers();
    const remoteIp =
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      requestHeaders.get("x-real-ip") ||
      "unknown";
    const allowed = await consumeManageRateLimit(email, remoteIp);
    const associated = allowed && (await hasManageableListing(email));

    if (associated && isSupabaseAuthConfigured()) {
      const environment = readPublicEnv();
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: buildManageCallbackUrl(
            environment.NEXT_PUBLIC_SITE_URL,
          ),
          shouldCreateUser: true,
        },
      });
    }
  } catch {
    // Authentication and database failures intentionally share the same public
    // response so this endpoint cannot become an account/listing oracle.
  }

  const remainingDelay = 350 - (Date.now() - startedAt);
  if (remainingDelay > 0) {
    await new Promise((resolve) => setTimeout(resolve, remainingDelay));
  }
  return { message: GENERIC_MANAGE_LINK_MESSAGE };
}

export async function signOutOwner(formData: FormData): Promise<never> {
  const nextValue = formData.get("next");
  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut({ scope: "local" });
  }
  redirect(
    `${safeManageRedirect(typeof nextValue === "string" ? nextValue : null)}?signedOut=1` as Route,
  );
}
