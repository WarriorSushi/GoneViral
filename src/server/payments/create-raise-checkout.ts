import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { moneyPaise } from "@/domain/money";
import {
  PAYMENT_ATTEMPT_EXPIRY_MINUTES,
  POLICY_VERSION,
} from "@/domain/policy";
import type { RaiseInput } from "@/domain/raise";
import {
  calculateMinimumRaise,
  calculateTakeoverQuote,
} from "@/domain/ranking";
import { getSqlClient } from "@/server/db/client";

import type { PaymentProvider } from "./provider";

export type RaiseCheckoutResult =
  | Readonly<{ checkoutUrl: string; kind: "checkout"; publicId: string }>
  | Readonly<{ kind: "pending"; publicId: string }>
  | Readonly<{ kind: "rejected"; message: string }>;

type RaiseListing = {
  confirmed_total_paise: bigint;
  id: string;
  lifecycle_status: string;
  moderation_status: string;
  name: string;
  original_sponsorship_paise: bigint | null;
};

function attemptPublicId() {
  return `att_${randomBytes(18).toString("base64url")}`;
}

export async function createRaiseCheckout(input: {
  email: string;
  form: RaiseInput;
  listingSlug: string;
  provider: PaymentProvider;
  siteUrl: string;
  userId: string;
}): Promise<RaiseCheckoutResult> {
  const sql = getSqlClient();
  const publicId = attemptPublicId();
  const expiresAt = new Date(
    Date.now() + PAYMENT_ATTEMPT_EXPIRY_MINUTES * 60_000,
  );

  const intent = await sql.begin(async (transaction) => {
    const [listing] = await transaction<RaiseListing[]>`
      SELECT listing.id, listing.name, listing.lifecycle_status,
             listing.moderation_status, listing.confirmed_total_paise,
             listing.original_sponsorship_paise
      FROM app.listings AS listing
      JOIN private.listing_owners AS ownership
        ON ownership.listing_id = listing.id
       AND ownership.user_id = ${input.userId}
       AND ownership.revoked_at IS NULL
      WHERE listing.slug = ${input.listingSlug}
      FOR UPDATE OF listing
    `;
    if (!listing) return { kind: "unauthorized" } as const;
    if (
      listing.lifecycle_status === "removed" ||
      listing.moderation_status === "suspended"
    ) {
      return { kind: "blocked" } as const;
    }
    if (listing.original_sponsorship_paise === null)
      return { kind: "blocked" } as const;

    const minimum = calculateMinimumRaise(
      moneyPaise(listing.original_sponsorship_paise),
    );
    if (input.form.amountPaise < minimum.minimumRequiredPaise) {
      return { kind: "below", minimum: minimum.minimumRequiredPaise } as const;
    }

    const [target] = input.form.targetSlug
      ? await transaction<{ id: string; rank: bigint; total: bigint }[]>`
          WITH ranked AS (
            SELECT id, slug, confirmed_total_paise AS total,
              row_number() OVER (
                ORDER BY confirmed_total_paise DESC,
                         current_total_reached_at ASC, id ASC
              ) AS rank
            FROM app.listings
            WHERE lifecycle_status = 'active' AND moderation_status = 'clear'
              AND confirmed_total_paise > 0
          )
          SELECT id, total, rank FROM ranked WHERE slug = ${input.form.targetSlug}
        `
      : [];
    if (input.form.targetSlug && (!target || target.id === listing.id)) {
      return { kind: "target" } as const;
    }
    if (target) {
      const quote = calculateTakeoverQuote({
        listingCurrentTotalPaise: moneyPaise(listing.confirmed_total_paise),
        minimumRequiredPaise: minimum.minimumRequiredPaise,
        targetTotalPaise: moneyPaise(target.total),
      });
      if (input.form.amountPaise < quote.requiredPaymentPaise) {
        return { kind: "below", minimum: quote.requiredPaymentPaise } as const;
      }
    }

    const requestHash = createHash("sha256")
      .update(
        JSON.stringify({
          amount: input.form.amountPaise.toString(),
          listingId: listing.id,
          minimum: minimum.minimumRequiredPaise.toString(),
          targetId: target?.id ?? null,
          userId: input.userId,
        }),
      )
      .digest("hex");
    const existing = await transaction<
      {
        provider_checkout_url: string | null;
        public_id: string;
        provider_order_request_hash: string;
      }[]
    >`
      SELECT public_id, provider_checkout_url, provider_order_request_hash
      FROM private.payment_attempts
      WHERE provider_environment = ${input.provider.environment}
        AND application_idempotency_key = ${input.form.applicationIdempotencyKey}
      LIMIT 1
    `;
    if (existing[0]) {
      return existing[0].provider_order_request_hash === requestHash
        ? ({ kind: "existing", row: existing[0] } as const)
        : ({ kind: "conflict" } as const);
    }

    const [rank] = await transaction<{ rank: bigint }[]>`
      WITH hypothetical AS (
        SELECT id, confirmed_total_paise, current_total_reached_at
        FROM app.listings WHERE lifecycle_status = 'active' AND moderation_status = 'clear'
      ), ranked AS (
        SELECT id, row_number() OVER (
          ORDER BY CASE WHEN id = ${listing.id}
            THEN confirmed_total_paise + ${input.form.amountPaise}
            ELSE confirmed_total_paise END DESC,
            CASE WHEN id = ${listing.id} THEN transaction_timestamp()
              ELSE current_total_reached_at END ASC, id ASC
        ) AS rank FROM hypothetical
      ) SELECT rank FROM ranked WHERE id = ${listing.id}
    `;
    await transaction`
      INSERT INTO private.payment_attempts (
        public_id, application_idempotency_key, provider, provider_environment,
        listing_id, purpose, state, amount_paise, currency, policy_version,
        minimum_required_paise_snapshot, target_listing_id_snapshot,
        target_rank_snapshot, target_total_paise_snapshot,
        listing_total_paise_snapshot, estimated_rank_snapshot,
        requested_by_user_id, provider_order_request_hash,
        customer_phone_e164, checkout_expires_at
      ) VALUES (
        ${publicId}, ${input.form.applicationIdempotencyKey}, 'dodo',
        ${input.provider.environment}, ${listing.id}, 'raise',
        'provider_order_pending', ${input.form.amountPaise}, 'INR', ${POLICY_VERSION},
        ${minimum.minimumRequiredPaise}, ${target?.id ?? null}, ${target?.rank ?? null},
        ${target?.total ?? null}, ${listing.confirmed_total_paise}, ${rank?.rank ?? null},
        ${input.userId}, ${requestHash}, ${input.form.phone}, ${expiresAt.toISOString()}
      )
    `;
    return { kind: "created", listing, requestHash } as const;
  });

  if (intent.kind === "below")
    return {
      kind: "rejected",
      message: `This raise must be at least ₹${intent.minimum / 100n}.`,
    };
  if (intent.kind === "unauthorized")
    return { kind: "rejected", message: "You cannot raise this listing." };
  if (intent.kind === "blocked")
    return {
      kind: "rejected",
      message: "This listing cannot be raised while hidden or removed.",
    };
  if (intent.kind === "target")
    return { kind: "rejected", message: "That target is no longer available." };
  if (intent.kind === "conflict")
    return { kind: "rejected", message: "Refresh this page and try again." };
  if (intent.kind === "existing")
    return intent.row.provider_checkout_url
      ? {
          checkoutUrl: intent.row.provider_checkout_url,
          kind: "checkout",
          publicId: intent.row.public_id,
        }
      : { kind: "pending", publicId: intent.row.public_id };

  const result = await input.provider.createCheckout({
    amountPaise: input.form.amountPaise,
    customer: {
      email: input.email,
      name: intent.listing.name,
      phone: input.form.phone,
    },
    publicAttemptId: publicId,
    requestId: intent.requestHash,
    returnUrl: `${input.siteUrl}/manage/${input.listingSlug}/raise/${publicId}/return`,
  });
  if (result.kind === "created" || result.kind === "recovered") {
    await sql`
      UPDATE private.payment_attempts SET
        provider_order_id = ${result.session.sessionId},
        provider_checkout_session_id = ${result.session.sessionId},
        provider_checkout_url = ${result.session.checkoutUrl},
        provider_created_at = ${result.session.createdAt.toISOString()},
        state = 'checkout_ready', updated_at = now()
      WHERE public_id = ${publicId} AND state = 'provider_order_pending'
    `;
    return {
      checkoutUrl: result.session.checkoutUrl,
      kind: "checkout",
      publicId,
    };
  }
  if (result.kind === "rejected") {
    await sql`UPDATE private.payment_attempts SET state = 'failed', failure_code = ${result.safeCode}, updated_at = now() WHERE public_id = ${publicId}`;
    return {
      kind: "rejected",
      message: "Checkout could not be opened. Please try later.",
    };
  }
  return { kind: "pending", publicId };
}
