import "server-only";

import { randomUUID } from "node:crypto";

import type postgres from "postgres";

import { getSqlClient } from "@/server/db/client";
import { EMAIL_TEMPLATE_VERSION } from "@/server/email/templates";
import { encryptPrivateText } from "@/server/security/private-data";
import { submissionDigest } from "@/server/security/submission-security";
import { publishPreparedGuestLogoForAttempt } from "@/server/storage/guest-logo-service";
import { SupabaseLogoStorage } from "@/server/storage/logo-storage";
import { logger } from "@/server/telemetry/logger";
import { moneyPaise } from "@/domain/money";
import { calculateMinimumRaise } from "@/domain/ranking";
import type { PaymentEnvironment } from "@/server/payments/provider";

import type { NormalizedDodoEvent } from "./dodo-webhook";
import {
  applyPendingAdjustmentsForPayment,
  processProviderAdjustment,
} from "./process-provider-adjustment";

export type DodoWebhookResult = Readonly<{
  businessDate?: string;
  categorySlug?: string;
  kind: "duplicate" | "processed" | "quarantined";
  listingPublicId?: string;
  listingSlug?: string;
  mainRank?: bigint | null;
  reason?: string;
}>;

type EventRow = {
  id: string;
  processing_state: string;
  raw_body_digest: string;
};

type AttemptRow = {
  amount_paise: bigint;
  currency: string;
  fulfilled_ledger_entry_id: string | null;
  id: string;
  listing_id: string;
  minimum_required_paise_snapshot: bigint;
  pending_owner_id: string | null;
  policy_version: string;
  provider: string;
  provider_environment: string;
  provider_order_id: string | null;
  public_id: string;
  purpose: string;
  requested_by_user_id: string | null;
  state: string;
};

type ProviderPaymentRow = {
  amount_paise: bigint;
  currency: string;
  fulfilled_ledger_entry_id: string | null;
  payment_attempt_id: string | null;
  provider_order_id: string;
  status: string;
};

type ListingRow = {
  category_slug: string;
  confirmed_total_paise: bigint;
  id: string;
  lifecycle_status: string;
  moderation_status: string;
  name: string;
  original_sponsorship_paise: bigint | null;
  public_id: string;
  slug: string;
};

function mergedPaymentStatus(current: string, observed: string): string {
  if (current === "succeeded" || current === observed) return current;
  if (observed === "succeeded") return observed;
  if (current === "pending") return observed;
  if (observed === "pending") return current;
  return current;
}

export async function processDodoWebhook(input: {
  event: NormalizedDodoEvent;
  eventId: string;
  expectedBusinessId: string;
  providerEnvironment: PaymentEnvironment;
}): Promise<DodoWebhookResult> {
  const sql = getSqlClient();

  const result = await sql.begin(async (transactionSql) => {
    await transactionSql`
      INSERT INTO private.provider_events (
        provider, provider_environment, provider_event_id,
        provider_event_type, signature_status, raw_body_digest,
        provider_created_at, processing_state, normalized_event_type,
        attempt_count
      ) VALUES (
        'dodo', ${input.providerEnvironment}, ${input.eventId},
        ${input.event.eventType}, 'verified', ${input.event.rawBodyDigest},
        ${input.event.providerCreatedAt.toISOString()}, 'received',
        ${input.event.normalizedType}, 1
      ) ON CONFLICT (provider, provider_environment, provider_event_id)
      DO NOTHING
    `;
    const [eventRow] = await transactionSql<EventRow[]>`
      SELECT id, processing_state, raw_body_digest
      FROM private.provider_events
      WHERE provider = 'dodo'
        AND provider_environment = ${input.providerEnvironment}
        AND provider_event_id = ${input.eventId}
      FOR UPDATE
    `;
    if (!eventRow) throw new Error("provider_event_missing_after_insert");

    if (eventRow.raw_body_digest !== input.event.rawBodyDigest) {
      await transactionSql`
        UPDATE private.provider_events
        SET processing_state = 'quarantined',
            semantic_error_code = 'event_id_collision',
            processed_at = COALESCE(processed_at, transaction_timestamp()),
            last_error_code = 'event_id_collision'
        WHERE id = ${eventRow.id}
      `;
      return {
        kind: "quarantined",
        reason: "event_id_collision",
      } as const;
    }
    if (["processed", "quarantined"].includes(eventRow.processing_state)) {
      return { kind: "duplicate" } as const;
    }

    const quarantineEvent = async (
      reason: string,
      attemptId?: string,
      paymentId?: string,
    ) => {
      await transactionSql`
        UPDATE private.provider_events
        SET processing_state = 'quarantined',
            semantic_error_code = ${reason},
            payment_attempt_id = ${attemptId ?? null},
            provider_payment_id = ${paymentId ?? null},
            processed_at = transaction_timestamp(),
            last_error_code = ${reason}
        WHERE id = ${eventRow.id}
      `;
      if (attemptId) {
        await transactionSql`
          UPDATE private.payment_attempts
          SET state = 'quarantined', quarantine_reason = ${reason},
              updated_at = transaction_timestamp()
          WHERE id = ${attemptId}
            AND state NOT IN ('succeeded', 'duplicate_paid', 'cancelled')
        `;
      }
      return { kind: "quarantined", reason } as const;
    };

    if (input.event.businessId !== input.expectedBusinessId) {
      return quarantineEvent("business_mismatch");
    }
    const providerPaymentIdentity =
      input.event.adjustment?.paymentId ?? input.event.payment?.paymentId;
    if (providerPaymentIdentity) {
      // Webhooks and reconciliation can observe payment and adjustment records in
      // either order. A transaction-scoped identity lock gives every path the same
      // outer lock and prevents payment/attempt/adjustment row-lock inversions.
      await transactionSql`
        SELECT pg_advisory_xact_lock(
          hashtextextended(
            ${`dodo:${input.providerEnvironment}:${providerPaymentIdentity}`}, 0
          )
        )
      `;
    }
    if (
      input.event.normalizedType === "adjustment_status" &&
      input.event.adjustment
    ) {
      return processProviderAdjustment({
        adjustment: input.event.adjustment,
        eventId: input.eventId,
        eventRowId: eventRow.id,
        providerEnvironment: input.providerEnvironment,
        transaction: transactionSql,
      });
    }
    if (input.event.normalizedType === "unknown" || !input.event.payment) {
      return quarantineEvent("unknown_event_type");
    }

    const payment = input.event.payment;
    if (!payment.attemptPublicId) {
      return quarantineEvent(
        "missing_attempt_metadata",
        undefined,
        payment.paymentId,
      );
    }
    const [attempt] = await transactionSql<AttemptRow[]>`
      SELECT id, public_id, provider, provider_environment, provider_order_id,
             listing_id, purpose, state, amount_paise, currency, policy_version,
             minimum_required_paise_snapshot, pending_owner_id,
             requested_by_user_id,
             fulfilled_ledger_entry_id
      FROM private.payment_attempts
      WHERE public_id = ${payment.attemptPublicId}
      FOR UPDATE
    `;
    if (!attempt) {
      return quarantineEvent("attempt_not_found", undefined, payment.paymentId);
    }
    if (!payment.orderId) {
      return quarantineEvent(
        "missing_provider_order",
        attempt.id,
        payment.paymentId,
      );
    }

    await transactionSql`
      INSERT INTO private.provider_payments (
        provider, provider_environment, provider_payment_id,
        provider_order_id, payment_attempt_id, amount_paise, currency,
        status, payment_method_family, provider_created_at,
        provider_updated_at, settled_at
      ) VALUES (
        'dodo', ${input.providerEnvironment}, ${payment.paymentId},
        ${payment.orderId}, ${attempt.id}, ${payment.amountPaise},
        ${payment.currency}, ${payment.status ?? payment.providerStatus ?? "unknown"},
        ${payment.paymentMethod}, ${payment.providerCreatedAt.toISOString()},
        ${payment.providerUpdatedAt?.toISOString() ?? null},
        ${payment.status === "succeeded" ? input.event.providerCreatedAt.toISOString() : null}
      ) ON CONFLICT (provider, provider_environment, provider_payment_id)
      DO NOTHING
    `;
    const [storedPayment] = await transactionSql<ProviderPaymentRow[]>`
      SELECT provider_order_id, payment_attempt_id, amount_paise, currency,
             status, fulfilled_ledger_entry_id
      FROM private.provider_payments
      WHERE provider = 'dodo'
        AND provider_environment = ${input.providerEnvironment}
        AND provider_payment_id = ${payment.paymentId}
      FOR UPDATE
    `;
    if (!storedPayment)
      throw new Error("provider_payment_missing_after_insert");

    const paymentIdentityMismatch =
      storedPayment.provider_order_id !== payment.orderId ||
      storedPayment.payment_attempt_id !== attempt.id ||
      storedPayment.amount_paise !== payment.amountPaise ||
      storedPayment.currency !== payment.currency;
    if (paymentIdentityMismatch) {
      return quarantineEvent(
        "provider_payment_identity_collision",
        attempt.id,
        payment.paymentId,
      );
    }

    const paymentStatus = payment.status;
    if (paymentStatus === null) {
      return quarantineEvent(
        "event_status_mismatch",
        attempt.id,
        payment.paymentId,
      );
    }
    const semanticReason =
      attempt.provider !== "dodo"
        ? "provider_mismatch"
        : attempt.provider_environment !== input.providerEnvironment
          ? "environment_mismatch"
          : attempt.provider_order_id !== payment.orderId
            ? "order_mismatch"
            : attempt.amount_paise !== payment.amountPaise
              ? "amount_mismatch"
              : attempt.currency !== payment.currency ||
                  payment.currency !== "INR"
                ? "currency_mismatch"
                : null;
    if (semanticReason) {
      return quarantineEvent(semanticReason, attempt.id, payment.paymentId);
    }

    const nextProviderStatus = mergedPaymentStatus(
      storedPayment.status,
      paymentStatus,
    );
    await transactionSql`
      UPDATE private.provider_payments
      SET status = ${nextProviderStatus},
          last_seen_at = transaction_timestamp(),
          provider_updated_at = COALESCE(
            ${payment.providerUpdatedAt?.toISOString() ?? null},
            provider_updated_at
          ),
          settled_at = CASE
            WHEN ${nextProviderStatus} = 'succeeded'
            THEN COALESCE(settled_at, ${input.event.providerCreatedAt.toISOString()})
            ELSE settled_at
          END
      WHERE provider = 'dodo'
        AND provider_environment = ${input.providerEnvironment}
        AND provider_payment_id = ${payment.paymentId}
    `;

    if (paymentStatus !== "succeeded") {
      const nextAttemptState =
        paymentStatus === "pending"
          ? "provider_pending"
          : paymentStatus === "failed"
            ? "failed"
            : "dropped";
      await transactionSql`
        UPDATE private.payment_attempts
        SET state = ${nextAttemptState}, updated_at = transaction_timestamp(),
            failure_code = CASE
              WHEN ${nextAttemptState} IN ('failed', 'dropped')
              THEN ${`dodo_${paymentStatus}`}
              ELSE failure_code
            END
        WHERE id = ${attempt.id}
          AND state IN ('checkout_ready', 'customer_returned', 'provider_pending')
      `;
      await transactionSql`
        UPDATE private.provider_events
        SET processing_state = 'processed', payment_attempt_id = ${attempt.id},
            provider_payment_id = ${payment.paymentId},
            normalized_event_type = ${`payment_${paymentStatus}`},
            processed_at = transaction_timestamp(), last_error_code = NULL
        WHERE id = ${eventRow.id}
      `;
      return { kind: "processed" } as const;
    }

    if (attempt.fulfilled_ledger_entry_id) {
      const [fulfilledPayment] = await transactionSql<
        { provider_payment_id: string }[]
      >`
        SELECT provider_payment_id
        FROM private.provider_payments
        WHERE fulfilled_ledger_entry_id = ${attempt.fulfilled_ledger_entry_id}
        LIMIT 1
      `;
      if (fulfilledPayment?.provider_payment_id === payment.paymentId) {
        await transactionSql`
          UPDATE private.provider_events
          SET processing_state = 'processed', payment_attempt_id = ${attempt.id},
              provider_payment_id = ${payment.paymentId},
              normalized_event_type = 'payment_succeeded',
              processed_at = transaction_timestamp(), last_error_code = NULL
          WHERE id = ${eventRow.id}
        `;
        return { kind: "duplicate" } as const;
      }

      await transactionSql`
        UPDATE private.provider_events
        SET processing_state = 'quarantined', payment_attempt_id = ${attempt.id},
            provider_payment_id = ${payment.paymentId},
            semantic_error_code = 'duplicate_paid',
            processed_at = transaction_timestamp(), last_error_code = 'duplicate_paid'
        WHERE id = ${eventRow.id}
      `;
      await createOperationsReview({
        attemptId: attempt.id,
        eventId: input.eventId,
        listingId: attempt.listing_id,
        paymentId: payment.paymentId,
        providerEnvironment: input.providerEnvironment,
        reason: "duplicate_paid",
        transactionSql,
      });
      return { kind: "quarantined", reason: "duplicate_paid" } as const;
    }

    const [listing] = await transactionSql<ListingRow[]>`
      SELECT l.id, l.public_id, l.slug, l.name, l.lifecycle_status,
             l.moderation_status, l.confirmed_total_paise,
             l.original_sponsorship_paise, c.slug AS category_slug
      FROM app.listings l
      JOIN app.categories c ON c.id = l.category_id
      WHERE l.id = ${attempt.listing_id}
      FOR UPDATE OF l
    `;
    if (!listing)
      return quarantineEvent(
        "listing_not_found",
        attempt.id,
        payment.paymentId,
      );
    const isInitial = attempt.purpose === "initial_sponsorship";
    const isRaise = attempt.purpose === "raise";
    const raiseMinimum =
      listing.original_sponsorship_paise === null
        ? null
        : calculateMinimumRaise(moneyPaise(listing.original_sponsorship_paise))
            .minimumRequiredPaise;
    if (
      (!isInitial && !isRaise) ||
      payment.amountPaise < attempt.minimum_required_paise_snapshot ||
      (isInitial && listing.original_sponsorship_paise !== null) ||
      (isRaise &&
        (listing.original_sponsorship_paise === null ||
          attempt.requested_by_user_id === null ||
          raiseMinimum === null ||
          attempt.minimum_required_paise_snapshot !== raiseMinimum ||
          payment.amountPaise < raiseMinimum))
    ) {
      return quarantineEvent(
        isRaise ? "raise_fulfilment_invalid" : "initial_fulfilment_invalid",
        attempt.id,
        payment.paymentId,
      );
    }

    const [clock] = await transactionSql<
      { applied_at: Date | string; business_date: string }[]
    >`
      SELECT transaction_timestamp() AS applied_at,
             (transaction_timestamp() AT TIME ZONE 'Asia/Kolkata')::date
               AS business_date
    `;
    if (!clock) throw new Error("transaction_clock_missing");
    const appliedAt = new Date(clock.applied_at);
    if (Number.isNaN(appliedAt.getTime()))
      throw new Error("transaction_clock_invalid");
    const [ledger] = await transactionSql<
      { applied_business_date: string; id: string }[]
    >`
      INSERT INTO private.financial_ledger (
        listing_id, entry_type, amount_delta_paise, currency,
        payment_attempt_id, provider_payment_id, policy_version,
        applied_at, applied_business_date, provider_effective_at,
        source_key, source_provider, source_environment, metadata
      ) VALUES (
        ${listing.id}, ${attempt.purpose}, ${payment.amountPaise}, 'INR',
        ${attempt.id}, ${payment.paymentId}, ${attempt.policy_version},
        ${appliedAt.toISOString()},
        ${clock.business_date},
        ${input.event.providerCreatedAt.toISOString()},
        ${`dodo:${input.providerEnvironment}:payment:${payment.paymentId}:${attempt.purpose}`},
        'dodo', ${input.providerEnvironment},
        (${JSON.stringify({ eventId: input.eventId })}::jsonb #>> '{}')::jsonb
      ) RETURNING id, applied_business_date
    `;
    if (!ledger) throw new Error("ledger_insert_failed");

    const keepRemoved = listing.lifecycle_status === "removed";
    await transactionSql`
      UPDATE app.listings
      SET confirmed_total_paise = confirmed_total_paise + ${payment.amountPaise},
          original_sponsorship_paise = CASE
            WHEN ${isInitial} THEN ${payment.amountPaise}
            ELSE original_sponsorship_paise
          END,
          current_total_reached_at = ${appliedAt.toISOString()},
          first_confirmed_at = COALESCE(first_confirmed_at, ${appliedAt.toISOString()}),
          last_rank_change_at = ${appliedAt.toISOString()},
          category_locked_at = COALESCE(category_locked_at, ${appliedAt.toISOString()}),
          lifecycle_status = CASE WHEN ${keepRemoved} THEN 'removed' ELSE 'active' END,
          version = version + 1, updated_at = transaction_timestamp()
      WHERE id = ${listing.id}
    `;
    await transactionSql`
      INSERT INTO app.listing_daily_totals (
        listing_id, business_date, net_amount_paise, total_reached_at,
        last_ledger_entry_id, updated_at
      ) VALUES (
        ${listing.id}, ${ledger.applied_business_date}, ${payment.amountPaise},
        ${appliedAt.toISOString()}, ${ledger.id}, transaction_timestamp()
      ) ON CONFLICT (listing_id, business_date) DO UPDATE
      SET net_amount_paise = app.listing_daily_totals.net_amount_paise + EXCLUDED.net_amount_paise,
          total_reached_at = EXCLUDED.total_reached_at,
          last_ledger_entry_id = EXCLUDED.last_ledger_entry_id,
          updated_at = transaction_timestamp()
    `;
    await transactionSql`
      UPDATE private.payment_attempts
      SET state = 'succeeded', fulfilled_ledger_entry_id = ${ledger.id},
          succeeded_at = ${appliedAt.toISOString()}, failure_code = NULL,
          quarantine_reason = NULL, updated_at = transaction_timestamp()
      WHERE id = ${attempt.id}
    `;
    await transactionSql`
      UPDATE private.provider_payments
      SET status = 'succeeded', fulfilled_ledger_entry_id = ${ledger.id},
          settled_at = COALESCE(settled_at, ${input.event.providerCreatedAt.toISOString()}),
          last_seen_at = transaction_timestamp()
      WHERE provider = 'dodo'
        AND provider_environment = ${input.providerEnvironment}
        AND provider_payment_id = ${payment.paymentId}
    `;
    await transactionSql`
      UPDATE private.provider_events
      SET processing_state = 'processed', payment_attempt_id = ${attempt.id},
          provider_payment_id = ${payment.paymentId},
          normalized_event_type = 'payment_succeeded',
          processed_at = transaction_timestamp(), semantic_error_code = NULL,
          last_error_code = NULL
      WHERE id = ${eventRow.id}
    `;

    const adjustmentResult = await applyPendingAdjustmentsForPayment({
      paymentId: payment.paymentId,
      providerEnvironment: input.providerEnvironment,
      transaction: transactionSql,
    });

    const [owner] = isInitial
      ? await transactionSql<{ canonical_email: string; email_hash: string }[]>`
      SELECT canonical_email, email_hash
      FROM private.pending_listing_owners
      WHERE id = ${attempt.pending_owner_id}
      LIMIT 1
    `
      : await transactionSql<{ canonical_email: string; email_hash: string }[]>`
      SELECT lower(email) AS canonical_email, ''::text AS email_hash
      FROM auth.users
      WHERE id = ${attempt.requested_by_user_id} AND email IS NOT NULL
      LIMIT 1
    `;
    if (!owner && isInitial) throw new Error("pending_owner_missing");
    if (owner)
      await transactionSql`
      INSERT INTO private.email_outbox (
        kind, recipient_encrypted, recipient_hash, template_version,
        payload, idempotency_key, state, next_attempt_at
      ) VALUES (
        ${isInitial ? "sponsorship_confirmed_claim" : "raise_confirmed"}, ${encryptPrivateText(owner.canonical_email)},
        ${owner.email_hash || submissionDigest(owner.canonical_email)}, ${EMAIL_TEMPLATE_VERSION},
        (${JSON.stringify({
          amountPaise: payment.amountPaise.toString(),
          attemptPublicId: attempt.public_id,
          listingName: listing.name,
          listingPublicId: listing.public_id,
        })}::jsonb #>> '{}')::jsonb,
        ${`${isInitial ? "sponsorship-confirmed" : "raise-confirmed"}:${attempt.id}:${EMAIL_TEMPLATE_VERSION}`},
        'pending', transaction_timestamp()
      ) ON CONFLICT (idempotency_key) DO NOTHING
    `;
    if (!owner && isRaise) {
      await createOperationsReview({
        attemptId: attempt.id,
        eventId: input.eventId,
        listingId: listing.id,
        paymentId: payment.paymentId,
        providerEnvironment: input.providerEnvironment,
        reason: "raise_owner_email_missing",
        transactionSql,
      });
    }

    const hidden = keepRemoved || listing.moderation_status === "suspended";
    if (hidden) {
      await createOperationsReview({
        attemptId: attempt.id,
        eventId: input.eventId,
        listingId: listing.id,
        paymentId: payment.paymentId,
        providerEnvironment: input.providerEnvironment,
        reason: "settled_while_hidden",
        transactionSql,
      });
    }

    const [rank] = hidden
      ? []
      : await transactionSql<{ rank: bigint }[]>`
          WITH ranked AS (
            SELECT id, row_number() OVER (
              ORDER BY confirmed_total_paise DESC,
                       current_total_reached_at ASC, id ASC
            ) AS rank
            FROM app.listings
            WHERE lifecycle_status = 'active'
              AND moderation_status = 'clear'
              AND confirmed_total_paise > 0
          ) SELECT rank FROM ranked WHERE id = ${listing.id}
        `;

    return {
      businessDate:
        adjustmentResult?.businessDate ?? ledger.applied_business_date,
      categorySlug: listing.category_slug,
      kind: "processed",
      listingPublicId: listing.public_id,
      listingSlug: listing.slug,
      mainRank: rank?.rank ?? null,
    } as const;
  });

  const attemptPublicId = input.event.payment?.attemptPublicId;
  if (!attemptPublicId || result.kind === "quarantined") return result;
  try {
    const logoResult = await publishPreparedGuestLogoForAttempt(
      attemptPublicId,
      new SupabaseLogoStorage(),
    );
    return logoResult.kind === "published"
      ? { ...result, listingPublicId: logoResult.listingPublicId }
      : result;
  } catch (error) {
    logger.error("guest_logo_publish_failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return result;
  }
}

async function createOperationsReview(input: {
  attemptId: string;
  eventId: string;
  listingId: string;
  paymentId: string;
  providerEnvironment: string;
  reason: string;
  transactionSql: postgres.TransactionSql<{ bigint: bigint }>;
}) {
  const runId = randomUUID();
  const now = new Date().toISOString();
  await input.transactionSql`
    INSERT INTO private.reconciliation_runs (
      id, provider, environment, kind, window_start, window_end,
      state, completed_at, counts
    ) VALUES (
      ${runId}, 'dodo', ${input.providerEnvironment}, 'webhook_operations_review',
      ${now}, ${now}, 'completed', ${now},
      (${JSON.stringify({ open: "1" })}::jsonb #>> '{}')::jsonb
    )
  `;
  await input.transactionSql`
    INSERT INTO private.reconciliation_items (
      run_id, provider_object_type, provider_object_id,
      payment_attempt_id, listing_id, discrepancy_type,
      expected, actual, state
    ) VALUES (
      ${runId}, 'payment', ${input.paymentId}, ${input.attemptId},
      ${input.listingId}, ${input.reason},
      (${JSON.stringify({ action: "manual_review" })}::jsonb #>> '{}')::jsonb,
      (${JSON.stringify({ eventId: input.eventId })}::jsonb #>> '{}')::jsonb,
      'open'
    )
  `;
}
