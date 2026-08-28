import "server-only";

import { randomUUID } from "node:crypto";

import type postgres from "postgres";

import { encryptPrivateText } from "@/server/security/private-data";
import { submissionDigest } from "@/server/security/submission-security";

import type { NormalizedProviderAdjustment } from "./dodo-webhook";

type Transaction = postgres.TransactionSql<{ bigint: bigint }>;

type AdjustmentRow = {
  amount_paise: bigint;
  currently_applied_delta: bigint;
  desired_effective_delta: bigint;
  kind: "chargeback" | "refund";
  provider_adjustment_id: string;
  provider_created_at: Date | string | null;
  provider_payment_id: string;
  provider_updated_at: Date | string | null;
  status: string;
};

type PaymentRow = {
  amount_paise: bigint;
  currency: string;
  fulfilled_ledger_entry_id: string | null;
  payment_attempt_id: string | null;
};

type AttemptRow = {
  id: string;
  listing_id: string;
  policy_version: string;
};

type ListingRow = {
  category_slug: string;
  confirmed_total_paise: bigint;
  id: string;
  lifecycle_status: string;
  name: string;
  public_id: string;
  slug: string;
};

export type AdjustmentResult = Readonly<{
  businessDate?: string;
  categorySlug?: string;
  kind: "duplicate" | "processed" | "quarantined";
  listingPublicId?: string;
  listingSlug?: string;
  reason?: string;
}>;

export async function processProviderAdjustment(input: {
  adjustment: NormalizedProviderAdjustment;
  eventId: string;
  eventRowId: string;
  providerEnvironment: "mock" | "test_mode";
  transaction: Transaction;
}): Promise<AdjustmentResult> {
  const { adjustment, transaction } = input;
  if (
    adjustment.currency !== "INR" ||
    adjustment.amountPaise <= 0n ||
    adjustment.amountPaise % 100n !== 0n ||
    ![0n, -adjustment.amountPaise].includes(adjustment.desiredEffectiveDelta)
  ) {
    return quarantineEvent(input, "adjustment_amount_or_currency_invalid");
  }

  await transaction`
    INSERT INTO private.provider_adjustments (
      provider, provider_environment, provider_adjustment_id,
      provider_payment_id, kind, status, amount_paise, currency,
      desired_effective_delta, currently_applied_delta,
      provider_created_at, provider_updated_at
    ) VALUES (
      'dodo', ${input.providerEnvironment}, ${adjustment.adjustmentId},
      ${adjustment.paymentId}, ${adjustment.kind}, ${adjustment.status},
      ${adjustment.amountPaise}, ${adjustment.currency},
      ${adjustment.desiredEffectiveDelta}, 0,
      ${adjustment.providerCreatedAt.toISOString()},
      ${adjustment.providerUpdatedAt.toISOString()}
    ) ON CONFLICT (provider, provider_environment, provider_adjustment_id)
    DO NOTHING
  `;
  const [stored] = await lockAdjustment(
    transaction,
    input.providerEnvironment,
    adjustment.adjustmentId,
  );
  if (!stored) throw new Error("provider_adjustment_missing_after_insert");
  if (
    stored.provider_payment_id !== adjustment.paymentId ||
    stored.kind !== adjustment.kind ||
    stored.amount_paise !== adjustment.amountPaise
  ) {
    return quarantineEvent(input, "provider_adjustment_identity_collision");
  }
  await transaction`
    UPDATE private.provider_events
    SET provider_payment_id = ${adjustment.paymentId}
    WHERE id = ${input.eventRowId}
  `;

  const storedUpdatedAt = stored.provider_updated_at
    ? new Date(stored.provider_updated_at)
    : null;
  if (
    storedUpdatedAt &&
    storedUpdatedAt.getTime() > adjustment.providerUpdatedAt.getTime()
  ) {
    await markEventProcessed(input, "adjustment_stale_observation");
    return { kind: "duplicate" };
  }

  const explicitRestoration =
    adjustment.kind === "chargeback"
      ? ["dispute_cancelled", "dispute_won"].includes(adjustment.status)
      : ["cancelled", "reversed"].includes(adjustment.status);
  const desiredEffectiveDelta =
    adjustment.kind === "refund" &&
    stored.currently_applied_delta < 0n &&
    adjustment.desiredEffectiveDelta === 0n &&
    !explicitRestoration
      ? stored.desired_effective_delta
      : adjustment.desiredEffectiveDelta;

  await transaction`
    UPDATE private.provider_adjustments
    SET status = ${adjustment.status},
        desired_effective_delta = ${desiredEffectiveDelta},
        provider_updated_at = ${adjustment.providerUpdatedAt.toISOString()},
        last_seen_at = transaction_timestamp()
    WHERE provider = 'dodo'
      AND provider_environment = ${input.providerEnvironment}
      AND provider_adjustment_id = ${adjustment.adjustmentId}
  `;
  return applyLockedAdjustment({
    adjustmentId: adjustment.adjustmentId,
    eventId: input.eventId,
    eventRowId: input.eventRowId,
    providerEnvironment: input.providerEnvironment,
    transaction,
  });
}

export async function applyPendingAdjustmentsForPayment(input: {
  paymentId: string;
  providerEnvironment: "mock" | "test_mode";
  transaction: Transaction;
}) {
  const rows = await input.transaction<{ provider_adjustment_id: string }[]>`
    SELECT provider_adjustment_id
    FROM private.provider_adjustments
    WHERE provider = 'dodo'
      AND provider_environment = ${input.providerEnvironment}
      AND provider_payment_id = ${input.paymentId}
      AND desired_effective_delta <> currently_applied_delta
    ORDER BY provider_created_at ASC NULLS LAST, id
    FOR UPDATE
  `;
  let latest: AdjustmentResult | null = null;
  for (const row of rows) {
    latest = await applyLockedAdjustment({
      adjustmentId: row.provider_adjustment_id,
      eventId: `reconcile-payment:${input.paymentId}`,
      eventRowId: null,
      providerEnvironment: input.providerEnvironment,
      transaction: input.transaction,
    });
  }
  return latest;
}

async function applyLockedAdjustment(input: {
  adjustmentId: string;
  eventId: string;
  eventRowId: string | null;
  providerEnvironment: "mock" | "test_mode";
  transaction: Transaction;
}): Promise<AdjustmentResult> {
  const [adjustment] = await lockAdjustment(
    input.transaction,
    input.providerEnvironment,
    input.adjustmentId,
  );
  if (!adjustment) throw new Error("provider_adjustment_missing");

  const [payment] = await input.transaction<PaymentRow[]>`
    SELECT amount_paise, currency, payment_attempt_id,
           fulfilled_ledger_entry_id
    FROM private.provider_payments
    WHERE provider = 'dodo'
      AND provider_environment = ${input.providerEnvironment}
      AND provider_payment_id = ${adjustment.provider_payment_id}
    FOR UPDATE
  `;
  if (!payment) {
    if (input.eventRowId) {
      await createException(input, {
        attemptId: null,
        listingId: null,
        reason: "adjustment_payment_not_found",
      });
      return quarantineEvent(input, "adjustment_payment_not_found");
    }
    return { kind: "quarantined", reason: "adjustment_payment_not_found" };
  }

  const [attempt] = payment.payment_attempt_id
    ? await input.transaction<AttemptRow[]>`
        SELECT id, listing_id, policy_version
        FROM private.payment_attempts
        WHERE id = ${payment.payment_attempt_id}
        FOR UPDATE
      `
    : [];
  const rankEffectEligible = Boolean(
    attempt && payment.fulfilled_ledger_entry_id,
  );
  await input.transaction`
    UPDATE private.provider_adjustments
    SET payment_attempt_id = ${attempt?.id ?? null},
        listing_id = ${attempt?.listing_id ?? null},
        applies_to_ledger_entry_id = ${payment.fulfilled_ledger_entry_id},
        rank_effect_eligible = ${rankEffectEligible},
        last_seen_at = transaction_timestamp()
    WHERE provider = 'dodo'
      AND provider_environment = ${input.providerEnvironment}
      AND provider_adjustment_id = ${adjustment.provider_adjustment_id}
  `;
  await input.transaction`
    UPDATE private.reconciliation_items
    SET state = 'resolved', resolution = 'applied_after_provider_link_resolved',
        resolved_at = transaction_timestamp()
    WHERE provider_object_type = 'adjustment'
      AND provider_object_id = ${adjustment.provider_adjustment_id}
      AND discrepancy_type = 'adjustment_payment_not_found'
      AND state = 'open'
  `;

  if (
    payment.currency !== "INR" ||
    adjustment.amount_paise > payment.amount_paise
  ) {
    await createException(input, {
      attemptId: attempt?.id ?? null,
      listingId: attempt?.listing_id ?? null,
      reason: "adjustment_payment_mismatch",
    });
    if (input.eventRowId)
      return quarantineEvent(input, "adjustment_payment_mismatch");
    return { kind: "quarantined", reason: "adjustment_payment_mismatch" };
  }

  if (!rankEffectEligible || !attempt || !payment.fulfilled_ledger_entry_id) {
    await createException(input, {
      attemptId: attempt?.id ?? null,
      listingId: attempt?.listing_id ?? null,
      reason: "adjustment_unfulfilled_payment",
    });
    if (input.eventRowId)
      return quarantineEvent(input, "adjustment_unfulfilled_payment");
    return { kind: "quarantined", reason: "adjustment_unfulfilled_payment" };
  }

  const [aggregate] = await input.transaction<{ reversed_paise: bigint }[]>`
    SELECT COALESCE(-sum(desired_effective_delta), 0)::bigint AS reversed_paise
    FROM private.provider_adjustments
    WHERE provider = 'dodo'
      AND provider_environment = ${input.providerEnvironment}
      AND provider_payment_id = ${adjustment.provider_payment_id}
      AND rank_effect_eligible = true
  `;
  if ((aggregate?.reversed_paise ?? 0n) > payment.amount_paise) {
    await createException(input, {
      attemptId: attempt.id,
      listingId: attempt.listing_id,
      reason: "aggregate_reversal_exceeds_payment",
    });
    if (input.eventRowId)
      return quarantineEvent(input, "aggregate_reversal_exceeds_payment");
    return {
      kind: "quarantined",
      reason: "aggregate_reversal_exceeds_payment",
    };
  }

  const amountToApply =
    adjustment.desired_effective_delta - adjustment.currently_applied_delta;
  if (amountToApply === 0n) {
    if (input.eventRowId)
      await markEventProcessed(
        { eventRowId: input.eventRowId, transaction: input.transaction },
        "adjustment_noop",
      );
    return { kind: "duplicate" };
  }

  const [listing] = await input.transaction<ListingRow[]>`
    SELECT listing.id, listing.public_id, listing.slug, listing.name,
           listing.lifecycle_status, listing.confirmed_total_paise,
           category.slug AS category_slug
    FROM app.listings AS listing
    JOIN app.categories AS category ON category.id = listing.category_id
    WHERE listing.id = ${attempt.listing_id}
    FOR UPDATE OF listing
  `;
  if (!listing) throw new Error("adjustment_listing_missing");
  const newTotal = listing.confirmed_total_paise + amountToApply;
  if (newTotal < 0n) {
    await createException(input, {
      attemptId: attempt.id,
      listingId: listing.id,
      reason: "adjustment_would_make_total_negative",
    });
    if (input.eventRowId)
      return quarantineEvent(input, "adjustment_would_make_total_negative");
    return {
      kind: "quarantined",
      reason: "adjustment_would_make_total_negative",
    };
  }

  const [clock] = await input.transaction<
    { applied_at: Date | string; business_date: string }[]
  >`
    SELECT transaction_timestamp() AS applied_at,
           (transaction_timestamp() AT TIME ZONE 'Asia/Kolkata')::date
             AS business_date
  `;
  if (!clock) throw new Error("adjustment_clock_missing");
  const appliedAt = new Date(clock.applied_at);
  const entryType =
    amountToApply < 0n
      ? adjustment.kind
      : adjustment.kind === "refund"
        ? "refund_restoration"
        : "chargeback_restoration";
  const [negativeEntry] =
    amountToApply > 0n
      ? await input.transaction<{ id: string }[]>`
          SELECT id FROM private.financial_ledger
          WHERE source_provider = 'dodo'
            AND source_environment = ${input.providerEnvironment}
            AND provider_adjustment_id = ${adjustment.provider_adjustment_id}
            AND amount_delta_paise < 0
          ORDER BY applied_at DESC, id DESC LIMIT 1
        `
      : [];
  const observedAt = adjustment.provider_updated_at
    ? new Date(adjustment.provider_updated_at)
    : new Date();
  const [ledger] = await input.transaction<
    { applied_business_date: string; id: string }[]
  >`
    INSERT INTO private.financial_ledger (
      listing_id, entry_type, amount_delta_paise, currency,
      payment_attempt_id, provider_payment_id, provider_adjustment_id,
      reverses_ledger_entry_id, policy_version, applied_at,
      applied_business_date, provider_effective_at, source_key,
      source_provider, source_environment, metadata
    ) VALUES (
      ${listing.id}, ${entryType}, ${amountToApply}, 'INR', ${attempt.id},
      ${adjustment.provider_payment_id}, ${adjustment.provider_adjustment_id},
      ${amountToApply < 0n ? payment.fulfilled_ledger_entry_id : (negativeEntry?.id ?? null)},
      ${attempt.policy_version}, ${appliedAt.toISOString()},
      ${clock.business_date}, ${observedAt.toISOString()},
      ${`dodo:${input.providerEnvironment}:adjustment:${adjustment.provider_adjustment_id}:${adjustment.status}:${observedAt.toISOString()}:${adjustment.desired_effective_delta}`},
      'dodo', ${input.providerEnvironment},
      ${JSON.stringify({ eventId: input.eventId, status: adjustment.status })}::jsonb
    ) RETURNING id, applied_business_date
  `;
  if (!ledger) throw new Error("adjustment_ledger_insert_failed");

  await input.transaction`
    UPDATE app.listings
    SET confirmed_total_paise = ${newTotal},
        current_total_reached_at = ${appliedAt.toISOString()},
        last_rank_change_at = ${appliedAt.toISOString()},
        lifecycle_status = CASE
          WHEN lifecycle_status = 'removed' THEN 'removed'
          WHEN ${newTotal} = 0 THEN 'inactive_reversed'
          ELSE 'active'
        END,
        version = version + 1, updated_at = transaction_timestamp()
    WHERE id = ${listing.id}
  `;
  await input.transaction`
    INSERT INTO app.listing_daily_totals (
      listing_id, business_date, net_amount_paise, total_reached_at,
      last_ledger_entry_id, updated_at
    ) VALUES (
      ${listing.id}, ${ledger.applied_business_date}, ${amountToApply},
      ${appliedAt.toISOString()}, ${ledger.id}, transaction_timestamp()
    ) ON CONFLICT (listing_id, business_date) DO UPDATE
    SET net_amount_paise = app.listing_daily_totals.net_amount_paise + EXCLUDED.net_amount_paise,
        total_reached_at = EXCLUDED.total_reached_at,
        last_ledger_entry_id = EXCLUDED.last_ledger_entry_id,
        updated_at = transaction_timestamp()
  `;
  await input.transaction`
    UPDATE private.provider_adjustments
    SET currently_applied_delta = desired_effective_delta,
        last_seen_at = transaction_timestamp()
    WHERE provider = 'dodo'
      AND provider_environment = ${input.providerEnvironment}
      AND provider_adjustment_id = ${adjustment.provider_adjustment_id}
  `;
  await markRelatedEventsProcessed(input, attempt.id);
  await enqueueOwnerAdjustmentEmail(input.transaction, {
    amountDeltaPaise: amountToApply,
    adjustmentId: adjustment.provider_adjustment_id,
    entryType,
    ledgerId: ledger.id,
    listingId: listing.id,
    listingName: listing.name,
    listingPublicId: listing.public_id,
  });
  return {
    businessDate: ledger.applied_business_date,
    categorySlug: listing.category_slug,
    kind: "processed",
    listingPublicId: listing.public_id,
    listingSlug: listing.slug,
  };
}

async function lockAdjustment(
  transaction: Transaction,
  providerEnvironment: string,
  adjustmentId: string,
) {
  return transaction<AdjustmentRow[]>`
    SELECT provider_adjustment_id, provider_payment_id, kind, status,
           amount_paise, desired_effective_delta, currently_applied_delta,
           provider_created_at, provider_updated_at
    FROM private.provider_adjustments
    WHERE provider = 'dodo'
      AND provider_environment = ${providerEnvironment}
      AND provider_adjustment_id = ${adjustmentId}
    FOR UPDATE
  `;
}

async function markEventProcessed(
  input: {
    eventRowId: string;
    transaction: Transaction;
  },
  normalizedType: string,
) {
  await input.transaction`
    UPDATE private.provider_events
    SET processing_state = 'processed', normalized_event_type = ${normalizedType},
        processed_at = transaction_timestamp(), semantic_error_code = NULL,
        last_error_code = NULL
    WHERE id = ${input.eventRowId}
  `;
}

async function markRelatedEventsProcessed(
  input: {
    adjustmentId: string;
    eventRowId: string | null;
    providerEnvironment: string;
    transaction: Transaction;
  },
  attemptId: string,
) {
  await input.transaction`
    UPDATE private.provider_events
    SET processing_state = 'processed', payment_attempt_id = ${attemptId},
        normalized_event_type = 'adjustment_applied',
        processed_at = COALESCE(processed_at, transaction_timestamp()),
        semantic_error_code = NULL, last_error_code = NULL
    WHERE provider = 'dodo'
      AND provider_environment = ${input.providerEnvironment}
      AND (
        id = ${input.eventRowId}
        OR (
          provider_payment_id = (
            SELECT provider_payment_id FROM private.provider_adjustments
            WHERE provider = 'dodo'
              AND provider_environment = ${input.providerEnvironment}
              AND provider_adjustment_id = ${input.adjustmentId}
            LIMIT 1
          ) AND provider_event_type LIKE ANY(ARRAY['refund.%', 'dispute.%'])
        )
      )
  `;
}

async function quarantineEvent(
  input: {
    adjustmentId?: string;
    eventRowId: string | null;
    providerEnvironment?: string;
    transaction: Transaction;
  },
  reason: string,
): Promise<AdjustmentResult> {
  if (input.eventRowId) {
    await input.transaction`
      UPDATE private.provider_events
      SET processing_state = 'quarantined', semantic_error_code = ${reason},
          normalized_event_type = 'adjustment_status',
          processed_at = transaction_timestamp(), last_error_code = ${reason}
      WHERE id = ${input.eventRowId}
    `;
  }
  return { kind: "quarantined", reason };
}

async function createException(
  input: {
    adjustmentId: string;
    eventId: string;
    providerEnvironment: string;
    transaction: Transaction;
  },
  detail: {
    attemptId: string | null;
    listingId: string | null;
    reason: string;
  },
) {
  const runId = randomUUID();
  const now = new Date().toISOString();
  await input.transaction`
    INSERT INTO private.reconciliation_runs (
      id, provider, environment, kind, window_start, window_end,
      state, completed_at, counts, error_summary
    ) VALUES (
      ${runId}, 'dodo', ${input.providerEnvironment}, 'adjustment_exception',
      ${now}, ${now}, 'completed', ${now},
      ${JSON.stringify({ critical: "1", open: "1" })}::jsonb,
      ${detail.reason}
    )
  `;
  await input.transaction`
    INSERT INTO private.reconciliation_items (
      run_id, provider_object_type, provider_object_id,
      payment_attempt_id, listing_id, discrepancy_type,
      expected, actual, state
    ) VALUES (
      ${runId}, 'adjustment', ${input.adjustmentId}, ${detail.attemptId},
      ${detail.listingId}, ${detail.reason},
      ${JSON.stringify({ action: "operations_review" })}::jsonb,
      ${JSON.stringify({ eventId: input.eventId })}::jsonb, 'open'
    )
  `;
}

async function enqueueOwnerAdjustmentEmail(
  transaction: Transaction,
  input: {
    adjustmentId: string;
    amountDeltaPaise: bigint;
    entryType: string;
    ledgerId: string;
    listingId: string;
    listingName: string;
    listingPublicId: string;
  },
) {
  const [owner] = await transaction<
    { canonical_email: string; email_hash: string }[]
  >`
    SELECT lower(auth_user.email) AS canonical_email, ''::text AS email_hash
    FROM private.listing_owners AS ownership
    JOIN auth.users AS auth_user ON auth_user.id = ownership.user_id
    WHERE ownership.listing_id = ${input.listingId}
      AND ownership.revoked_at IS NULL AND auth_user.email IS NOT NULL
    UNION ALL
    SELECT pending.canonical_email, pending.email_hash
    FROM private.pending_listing_owners AS pending
    WHERE pending.listing_id = ${input.listingId}
    LIMIT 1
  `;
  if (!owner) return;
  await transaction`
    INSERT INTO private.email_outbox (
      kind, recipient_encrypted, recipient_hash, template_version,
      payload, idempotency_key, state, next_attempt_at
    ) VALUES (
      'sponsorship_adjusted', ${encryptPrivateText(owner.canonical_email)},
      ${owner.email_hash || submissionDigest(owner.canonical_email)},
      '2026-08-29-v1',
      ${JSON.stringify({
        adjustmentId: input.adjustmentId,
        amountDeltaPaise: input.amountDeltaPaise.toString(),
        entryType: input.entryType,
        listingName: input.listingName,
        listingPublicId: input.listingPublicId,
      })}::jsonb,
      ${`sponsorship-adjusted:${input.ledgerId}:2026-08-29-v1`},
      'pending', transaction_timestamp()
    ) ON CONFLICT (idempotency_key) DO NOTHING
  `;
}
