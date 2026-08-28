import "server-only";

import { createHash, randomBytes } from "node:crypto";

import {
  CONTENT_POLICY_VERSION,
  PRIVACY_VERSION,
  REFUND_POLICY_VERSION,
  TERMS_VERSION,
  type JoinInput,
} from "@/domain/join";
import {
  INITIAL_SPONSORSHIP_MIN_PAISE,
  PAYMENT_ATTEMPT_EXPIRY_MINUTES,
} from "@/domain/policy";
import { calculateTakeoverQuote } from "@/domain/ranking";
import { moneyPaise } from "@/domain/money";
import { screenSubmission } from "@/domain/screening";
import { getSqlClient } from "@/server/db/client";
import { submissionDigest } from "@/server/security/submission-security";
import type { TurnstileVerifier } from "@/server/security/turnstile";

import type { PaymentProvider } from "./provider";

export type GuestCheckoutResult =
  | Readonly<{ checkoutUrl: string; kind: "checkout"; publicId: string }>
  | Readonly<{ kind: "duplicate"; publicListingPath?: string }>
  | Readonly<{ kind: "pending"; publicId: string }>
  | Readonly<{
      kind: "rejected";
      message: string;
    }>;

type AttemptRow = {
  checkout_expires_at: Date | string;
  provider_checkout_url: string | null;
  provider_order_request_hash: string;
  public_id: string;
  state: string;
};

function publicId(prefix: "att" | "lst"): string {
  return `${prefix}_${randomBytes(18).toString("base64url")}`;
}

function slugFor(name: string): string {
  const stem = name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 50);
  return `${stem || "listing"}-${randomBytes(5).toString("hex")}`;
}

function requestHash(input: JoinInput): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        amountPaise: input.amountPaise.toString(),
        categorySlug: input.categorySlug,
        contentPolicyVersion: CONTENT_POLICY_VERSION,
        destination: input.destination.canonicalKey,
        email: input.email,
        name: input.name,
        phone: input.phone,
        policyVersion: input.policyVersion,
        privacyVersion: PRIVACY_VERSION,
        refundPolicyVersion: REFUND_POLICY_VERSION,
        tagline: input.tagline,
        targetSlug: input.targetSlug,
        termsVersion: TERMS_VERSION,
      }),
    )
    .digest("hex");
}

const ratePolicies = {
  application: { limit: 10n, seconds: 900 },
  destination: { limit: 3n, seconds: 3600 },
  email: { limit: 3n, seconds: 3600 },
  ip: { limit: 5n, seconds: 900 },
} as const;

async function consumeRateLimits(input: JoinInput, remoteIp: string) {
  const sql = getSqlClient();
  const subjects = {
    application: input.applicationIdempotencyKey,
    destination: input.destination.canonicalKey,
    email: input.email,
    ip: remoteIp,
  } as const;

  for (const [scope, policy] of Object.entries(ratePolicies)) {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const windowSeconds =
      Math.floor(nowSeconds / policy.seconds) * policy.seconds;
    const windowStart = new Date(windowSeconds * 1000);
    const expiresAt = new Date((windowSeconds + policy.seconds * 2) * 1000);
    const subject = submissionDigest(subjects[scope as keyof typeof subjects]);
    const rows = await sql<{ count: bigint }[]>`
      INSERT INTO private.rate_limit_buckets (
        scope, subject_hmac, window_start, count, expires_at
      ) VALUES (${scope}, ${subject}, ${windowStart.toISOString()}, 1, ${expiresAt.toISOString()})
      ON CONFLICT (scope, subject_hmac, window_start)
      DO UPDATE SET count = private.rate_limit_buckets.count + 1
      RETURNING count
    `;
    if ((rows[0]?.count ?? policy.limit + 1n) > policy.limit) return false;
  }
  return true;
}

export async function createGuestCheckout(input: {
  form: JoinInput;
  provider: PaymentProvider;
  remoteIp: string;
  siteUrl: string;
  turnstile: TurnstileVerifier;
}): Promise<GuestCheckoutResult> {
  const sql = getSqlClient();
  const intentHash = requestHash(input.form);
  const existing = await sql<AttemptRow[]>`
    SELECT public_id, provider_order_request_hash, provider_checkout_url,
           state, checkout_expires_at
    FROM private.payment_attempts
    WHERE provider_environment = ${input.provider.environment}
      AND application_idempotency_key = ${input.form.applicationIdempotencyKey}
    LIMIT 1
  `;
  if (existing[0]) {
    if (existing[0].provider_order_request_hash !== intentHash) {
      return {
        kind: "rejected",
        message: "That request could not be processed.",
      };
    }
    const expirableStates = new Set([
      "intent_created",
      "provider_order_pending",
      "checkout_ready",
      "customer_returned",
      "provider_pending",
    ]);
    if (
      expirableStates.has(existing[0].state) &&
      new Date(existing[0].checkout_expires_at).getTime() <= Date.now()
    ) {
      await sql`
        UPDATE private.payment_attempts
        SET state = 'expired', expired_at = now(), updated_at = now()
        WHERE public_id = ${existing[0].public_id}
          AND state IN (
            'intent_created', 'provider_order_pending', 'checkout_ready',
            'customer_returned', 'provider_pending'
          )
      `;
      return { kind: "pending", publicId: existing[0].public_id };
    }
    return existing[0].provider_checkout_url
      ? {
          checkoutUrl: existing[0].provider_checkout_url,
          kind: "checkout",
          publicId: existing[0].public_id,
        }
      : { kind: "pending", publicId: existing[0].public_id };
  }

  const verification = await input.turnstile.verify({
    expectedAction: "join",
    remoteIp: input.remoteIp,
    token: input.form.turnstileToken,
  });
  if (!verification.ok) {
    return {
      kind: "rejected",
      message: "The security check failed. Please try again.",
    };
  }
  if (!(await consumeRateLimits(input.form, input.remoteIp))) {
    return {
      kind: "rejected",
      message: "Too many attempts. Please wait and try again.",
    };
  }

  const screening = screenSubmission({
    destinationHost: input.form.destination.host,
    name: input.form.name,
    tagline: input.form.tagline,
  });
  if (screening.status === "rejected") {
    return { kind: "rejected", message: "This listing cannot be submitted." };
  }

  const attemptPublicId = publicId("att");
  const listingPublicId = publicId("lst");
  const listingSlug = slugFor(input.form.name);
  const checkoutExpiresAt = new Date(
    Date.now() + PAYMENT_ATTEMPT_EXPIRY_MINUTES * 60_000,
  );

  const transaction = await sql.begin(async (transactionSql) => {
    const duplicate = await transactionSql<
      { lifecycle_status: string; moderation_status: string; slug: string }[]
    >`
      SELECT slug, lifecycle_status, moderation_status
      FROM app.listings
      WHERE destination_canonical_key = ${input.form.destination.canonicalKey}
      LIMIT 1
    `;
    if (duplicate[0]) return { duplicate: duplicate[0] } as const;

    const category = await transactionSql<{ id: string }[]>`
      SELECT id FROM app.categories
      WHERE slug = ${input.form.categorySlug} AND is_active = true
      LIMIT 1
    `;
    if (!category[0]) return { invalidCategory: true } as const;
    const [target] = input.form.targetSlug
      ? await transactionSql<{ id: string; rank: bigint; total: bigint }[]>`
          WITH ranked AS (
            SELECT id, slug, confirmed_total_paise AS total,
              row_number() OVER (ORDER BY confirmed_total_paise DESC,
                current_total_reached_at ASC, id ASC) AS rank
            FROM app.listings WHERE lifecycle_status = 'active'
              AND moderation_status = 'clear' AND confirmed_total_paise > 0
          ) SELECT id, total, rank FROM ranked WHERE slug = ${input.form.targetSlug}
        `
      : [];
    if (input.form.targetSlug && !target)
      return { invalidTarget: true } as const;
    if (target) {
      const quote = calculateTakeoverQuote({
        listingCurrentTotalPaise: moneyPaise(0n),
        minimumRequiredPaise: moneyPaise(INITIAL_SPONSORSHIP_MIN_PAISE),
        targetTotalPaise: moneyPaise(target.total),
      });
      if (input.form.amountPaise < quote.requiredPaymentPaise) {
        return { targetMinimum: quote.requiredPaymentPaise } as const;
      }
    }

    const listingRows = await transactionSql<{ id: string }[]>`
      INSERT INTO app.listings (
        public_id, slug, name, name_normalized, tagline, destination_url,
        destination_canonical_key, destination_host, category_id,
        lifecycle_status, moderation_status
      ) VALUES (
        ${listingPublicId}, ${listingSlug}, ${input.form.name},
        ${input.form.name.normalize("NFKC").toLowerCase()}, ${input.form.tagline},
        ${input.form.destination.url}, ${input.form.destination.canonicalKey},
        ${input.form.destination.host}, ${category[0].id}, 'payment_pending',
        ${screening.status === "clear" ? "clear" : "pending_review"}
      )
      ON CONFLICT (destination_canonical_key) DO NOTHING
      RETURNING id
    `;
    if (!listingRows[0]) {
      const raced = await transactionSql<
        { lifecycle_status: string; moderation_status: string; slug: string }[]
      >`
        SELECT slug, lifecycle_status, moderation_status
        FROM app.listings
        WHERE destination_canonical_key = ${input.form.destination.canonicalKey}
        LIMIT 1
      `;
      return { duplicate: raced[0] } as const;
    }

    const ownerRows = await transactionSql<{ id: string }[]>`
      INSERT INTO private.pending_listing_owners (
        listing_id, canonical_email, email_hash, claim_state
      ) VALUES (
        ${listingRows[0].id}, ${input.form.email},
        ${submissionDigest(input.form.email)}, 'pending'
      ) RETURNING id
    `;
    const attemptRows = await transactionSql<{ id: string }[]>`
      INSERT INTO private.payment_attempts (
        public_id, application_idempotency_key, provider,
        provider_environment, listing_id, purpose, state, amount_paise,
        currency, policy_version, minimum_required_paise_snapshot,
        listing_total_paise_snapshot, pending_owner_id,
        target_listing_id_snapshot, target_rank_snapshot,
        target_total_paise_snapshot,
        provider_order_request_hash, customer_phone_e164, terms_version,
        privacy_version, refund_policy_version, content_policy_version,
        checkout_expires_at
      ) VALUES (
        ${attemptPublicId}, ${input.form.applicationIdempotencyKey}, 'dodo',
        ${input.provider.environment}, ${listingRows[0].id},
        'initial_sponsorship', 'provider_order_pending', ${input.form.amountPaise},
        'INR', ${input.form.policyVersion}, ${INITIAL_SPONSORSHIP_MIN_PAISE}, 0,
        ${ownerRows[0]!.id}, ${target?.id ?? null}, ${target?.rank ?? null},
        ${target?.total ?? null}, ${intentHash}, ${input.form.phone}, ${TERMS_VERSION},
        ${PRIVACY_VERSION}, ${REFUND_POLICY_VERSION}, ${CONTENT_POLICY_VERSION},
        ${checkoutExpiresAt.toISOString()}
      ) RETURNING id
    `;
    await transactionSql`
      UPDATE private.pending_listing_owners
      SET created_from_attempt_id = ${attemptRows[0]!.id}, updated_at = now()
      WHERE id = ${ownerRows[0]!.id}
    `;
    await transactionSql`
      INSERT INTO private.listing_screenings (
        listing_id, screening_version, result, result_codes, request_fingerprint
      ) VALUES (
        ${listingRows[0].id}, ${screening.rulesetVersion}, ${screening.status},
        ${JSON.stringify(screening.reasonCodes)}::jsonb, ${intentHash}
      )
    `;
    return { created: true } as const;
  });

  if ("invalidCategory" in transaction) {
    return { kind: "rejected", message: "Choose an available category." };
  }
  if ("invalidTarget" in transaction)
    return {
      kind: "rejected",
      message: "That leaderboard target is no longer available.",
    };
  if ("targetMinimum" in transaction)
    return {
      kind: "rejected",
      message: `Pay at least ₹${transaction.targetMinimum / 100n} for that current takeover quote.`,
    };
  if ("duplicate" in transaction) {
    const duplicate = transaction.duplicate;
    const eligible =
      duplicate?.lifecycle_status === "active" &&
      duplicate.moderation_status === "clear";
    return eligible
      ? { kind: "duplicate", publicListingPath: `/l/${duplicate.slug}` }
      : { kind: "duplicate" };
  }

  const providerResult = await input.provider.createCheckout({
    amountPaise: input.form.amountPaise,
    customer: {
      email: input.form.email,
      name: input.form.name,
      phone: input.form.phone,
    },
    publicAttemptId: attemptPublicId,
    requestId: intentHash,
    returnUrl: `${input.siteUrl}/join/${attemptPublicId}/return`,
  });

  if (
    providerResult.kind === "created" ||
    providerResult.kind === "recovered"
  ) {
    await sql`
      UPDATE private.payment_attempts
      SET provider_order_id = ${providerResult.session.sessionId},
          provider_checkout_session_id = ${providerResult.session.sessionId},
          provider_checkout_url = ${providerResult.session.checkoutUrl},
          provider_created_at = ${providerResult.session.createdAt.toISOString()},
          state = 'checkout_ready', updated_at = now()
      WHERE public_id = ${attemptPublicId}
        AND state = 'provider_order_pending'
        AND provider_order_id IS NULL
    `;
    return {
      checkoutUrl: providerResult.session.checkoutUrl,
      kind: "checkout",
      publicId: attemptPublicId,
    };
  }

  if (providerResult.kind === "rejected") {
    await sql`
      UPDATE private.payment_attempts
      SET state = 'failed', failure_code = ${providerResult.safeCode}, updated_at = now()
      WHERE public_id = ${attemptPublicId} AND state = 'provider_order_pending'
    `;
    return {
      kind: "rejected",
      message: "Checkout could not be opened. Please try later.",
    };
  }

  return { kind: "pending", publicId: attemptPublicId };
}
