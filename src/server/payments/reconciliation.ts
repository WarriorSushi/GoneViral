import "server-only";

import { createHash, randomUUID } from "node:crypto";

import DodoPayments from "dodopayments";
import type postgres from "postgres";

import { readServerEnv } from "@/config/env/server";
import { getSqlClient } from "@/server/db/client";
import { logger } from "@/server/telemetry/logger";

import type { NormalizedDodoEvent } from "./dodo-webhook";
import { getDodoWebhookConfiguration } from "./dodo-webhook";
import type { PaymentEnvironment } from "./provider";
import {
  processDodoWebhook,
  type DodoWebhookResult,
} from "./process-dodo-webhook";

export type ReconciliationObservation = Readonly<{
  event: NormalizedDodoEvent;
  providerObjectId: string;
  providerObjectType: "adjustment" | "payment";
}>;

export interface PaymentReconciliationSource {
  listObservations(input: {
    windowEnd: Date;
    windowStart: Date;
  }): Promise<readonly ReconciliationObservation[]>;
}

export type ReconciliationSummary = Readonly<{
  applied: number;
  discrepancies: number;
  duplicates: number;
  failed: number;
  quarantined: number;
  runId: string;
}>;

function stableDigest(parts: readonly (number | string)[]) {
  return createHash("sha256").update(parts.join(":"), "utf8").digest("hex");
}

function observationEventId(observation: ReconciliationObservation) {
  return `reconcile_${stableDigest([
    observation.providerObjectType,
    observation.providerObjectId,
    observation.event.eventType,
    observation.event.providerCreatedAt.toISOString(),
  ])}`;
}

export class DodoReconciliationSource implements PaymentReconciliationSource {
  readonly #businessId: string;
  readonly #client: DodoPayments;

  constructor(
    apiKey: string,
    businessId: string,
    environment: Exclude<PaymentEnvironment, "mock"> = "test_mode",
  ) {
    this.#businessId = businessId;
    this.#client = new DodoPayments({
      bearerToken: apiKey,
      environment,
      maxRetries: 2,
      timeout: 15_000,
    });
  }

  async listObservations(input: {
    windowEnd: Date;
    windowStart: Date;
  }): Promise<readonly ReconciliationObservation[]> {
    const query = {
      created_at_gte: input.windowStart.toISOString(),
      created_at_lte: input.windowEnd.toISOString(),
      page_size: 100,
    };
    const observations: ReconciliationObservation[] = [];

    for await (const listedPayment of this.#client.payments.list({
      ...query,
      status: "succeeded",
    })) {
      const payment = await this.#client.payments.retrieve(
        listedPayment.payment_id,
      );
      if (payment.business_id !== this.#businessId)
        throw new Error("dodo_reconciliation_business_mismatch");
      if (payment.status !== "succeeded") continue;
      const observedAt = new Date(payment.updated_at ?? payment.created_at);
      const attemptPublicId = payment.metadata.attempt_public_id;
      observations.push({
        event: {
          adjustment: null,
          businessId: payment.business_id,
          eventType: "payment.succeeded",
          normalizedType: "payment_status",
          payment: {
            amountPaise: BigInt(payment.total_amount),
            attemptPublicId:
              typeof attemptPublicId === "string" ? attemptPublicId : null,
            currency: payment.currency.toUpperCase(),
            orderId: payment.checkout_session_id ?? null,
            paymentId: payment.payment_id,
            paymentMethod: payment.payment_method ?? null,
            providerCreatedAt: new Date(payment.created_at),
            providerStatus: payment.status ?? "succeeded",
            providerUpdatedAt: payment.updated_at
              ? new Date(payment.updated_at)
              : null,
            status: "succeeded",
          },
          providerCreatedAt: observedAt,
          rawBodyDigest: stableDigest([
            "payment",
            payment.payment_id,
            observedAt.toISOString(),
          ]),
        },
        providerObjectId: payment.payment_id,
        providerObjectType: "payment",
      });
    }

    for await (const refund of this.#client.refunds.list(query)) {
      if (refund.business_id !== this.#businessId)
        throw new Error("dodo_reconciliation_business_mismatch");
      if (!refund.amount || !refund.currency) continue;
      if (refund.status !== "succeeded" && refund.status !== "failed") continue;
      const observedAt = new Date(refund.created_at);
      observations.push({
        event: {
          adjustment: {
            adjustmentId: refund.refund_id,
            amountPaise: BigInt(refund.amount),
            currency: refund.currency.toUpperCase(),
            desiredEffectiveDelta:
              refund.status === "succeeded" ? -BigInt(refund.amount) : 0n,
            kind: "refund",
            paymentId: refund.payment_id,
            providerCreatedAt: observedAt,
            providerUpdatedAt: observedAt,
            status: refund.status,
          },
          businessId: refund.business_id,
          eventType: `refund.${refund.status}`,
          normalizedType: "adjustment_status",
          payment: null,
          providerCreatedAt: observedAt,
          rawBodyDigest: stableDigest([
            "refund",
            refund.refund_id,
            refund.status,
            observedAt.toISOString(),
          ]),
        },
        providerObjectId: refund.refund_id,
        providerObjectType: "adjustment",
      });
    }

    for await (const dispute of this.#client.disputes.list(query)) {
      if (dispute.business_id !== this.#businessId)
        throw new Error("dodo_reconciliation_business_mismatch");
      const observedAt = new Date(dispute.created_at);
      const desiredEffectiveDelta = [
        "dispute_cancelled",
        "dispute_won",
      ].includes(dispute.dispute_status)
        ? 0n
        : -BigInt(dispute.amount);
      observations.push({
        event: {
          adjustment: {
            adjustmentId: dispute.dispute_id,
            amountPaise: BigInt(dispute.amount),
            currency: dispute.currency.toUpperCase(),
            desiredEffectiveDelta,
            kind: "chargeback",
            paymentId: dispute.payment_id,
            providerCreatedAt: observedAt,
            providerUpdatedAt: observedAt,
            status: dispute.dispute_status,
          },
          businessId: dispute.business_id,
          eventType: dispute.dispute_status.replace("dispute_", "dispute."),
          normalizedType: "adjustment_status",
          payment: null,
          providerCreatedAt: observedAt,
          rawBodyDigest: stableDigest([
            "dispute",
            dispute.dispute_id,
            dispute.dispute_status,
            observedAt.toISOString(),
          ]),
        },
        providerObjectId: dispute.dispute_id,
        providerObjectType: "adjustment",
      });
    }

    return observations;
  }
}

export class EmptyReconciliationSource implements PaymentReconciliationSource {
  async listObservations() {
    return [];
  }
}

export function createConfiguredReconciliationSource(): PaymentReconciliationSource {
  const environment = readServerEnv();
  if (environment.DODO_PAYMENTS_ENVIRONMENT === "mock")
    return new EmptyReconciliationSource();
  return new DodoReconciliationSource(
    environment.DODO_PAYMENTS_API_KEY!,
    environment.DODO_PAYMENTS_BUSINESS_ID!,
    environment.DODO_PAYMENTS_ENVIRONMENT,
  );
}

export async function runPaymentReconciliation(input?: {
  onProcessed?: (result: DodoWebhookResult) => Promise<void> | void;
  source?: PaymentReconciliationSource;
  windowEnd?: Date;
  windowStart?: Date;
}): Promise<ReconciliationSummary> {
  const sql = getSqlClient();
  const configuration = getDodoWebhookConfiguration();
  const windowEnd = input?.windowEnd ?? new Date();
  const windowStart =
    input?.windowStart ?? new Date(windowEnd.getTime() - 48 * 60 * 60 * 1_000);
  const source = input?.source ?? createConfiguredReconciliationSource();
  const runId = randomUUID();
  const counters = { applied: 0, duplicates: 0, failed: 0, quarantined: 0 };

  await sql`
    INSERT INTO private.reconciliation_runs (
      id, provider, environment, kind, window_start, window_end, state, counts
    ) VALUES (
      ${runId}, 'dodo', ${configuration.environment}, 'scheduled',
      ${windowStart.toISOString()}, ${windowEnd.toISOString()}, 'running',
      (${JSON.stringify(counters)}::jsonb #>> '{}')::jsonb
    )
  `;

  try {
    const observations = await source.listObservations({
      windowEnd,
      windowStart,
    });
    for (const observation of observations) {
      const result = await processDodoWebhook({
        event: observation.event,
        eventId: observationEventId(observation),
        expectedBusinessId: configuration.businessId,
        providerEnvironment: configuration.environment,
      });
      if (result.kind === "processed") counters.applied += 1;
      else if (result.kind === "duplicate") counters.duplicates += 1;
      else counters.quarantined += 1;
      if (result.kind === "processed" && input?.onProcessed) {
        try {
          await input.onProcessed(result);
        } catch (cacheError) {
          logger.error("reconciliation_cache_invalidation_failed", {
            errorName:
              cacheError instanceof Error ? cacheError.name : "UnknownError",
            runId,
          });
        }
      }
    }

    const discrepancies = await auditFinancialProjections(runId);
    await sql`
      UPDATE private.reconciliation_runs
      SET state = 'completed', completed_at = transaction_timestamp(),
          counts = (${JSON.stringify({ ...counters, discrepancies })}::jsonb #>> '{}')::jsonb
      WHERE id = ${runId}
    `;
    if (discrepancies > 0) {
      logger.error("payment_reconciliation_discrepancies", {
        discrepancies,
        runId,
      });
    }
    return { ...counters, discrepancies, runId };
  } catch (error) {
    counters.failed += 1;
    const errorName = error instanceof Error ? error.name : "UnknownError";
    await sql`
      UPDATE private.reconciliation_runs
      SET state = 'failed', completed_at = transaction_timestamp(),
          counts = (${JSON.stringify(counters)}::jsonb #>> '{}')::jsonb,
          error_summary = ${errorName}
      WHERE id = ${runId}
    `;
    logger.error("payment_reconciliation_failed", { errorName, runId });
    throw error;
  }
}

async function auditFinancialProjections(runId: string) {
  const sql = getSqlClient();
  const listingDrift = await sql<
    {
      actual_total: bigint;
      expected_total: bigint;
      listing_id: string;
    }[]
  >`
    SELECT listing.id AS listing_id,
           listing.confirmed_total_paise AS actual_total,
           COALESCE(sum(ledger.amount_delta_paise), 0)::bigint AS expected_total
    FROM app.listings AS listing
    JOIN private.financial_ledger AS ledger ON ledger.listing_id = listing.id
    GROUP BY listing.id, listing.confirmed_total_paise
    HAVING listing.confirmed_total_paise <> COALESCE(sum(ledger.amount_delta_paise), 0)
  `;
  const dailyDrift = await sql<
    {
      actual_total: bigint | null;
      business_date: string;
      expected_total: bigint | null;
      listing_id: string;
    }[]
  >`
    WITH expected AS (
      SELECT listing_id, applied_business_date AS business_date,
             sum(amount_delta_paise)::bigint AS expected_total
      FROM private.financial_ledger GROUP BY listing_id, applied_business_date
    ), actual AS (
      SELECT listing_id, business_date, net_amount_paise AS actual_total
      FROM app.listing_daily_totals
    )
    SELECT COALESCE(expected.listing_id, actual.listing_id) AS listing_id,
           COALESCE(expected.business_date, actual.business_date) AS business_date,
           expected.expected_total, actual.actual_total
    FROM expected FULL OUTER JOIN actual USING (listing_id, business_date)
    WHERE expected.expected_total IS DISTINCT FROM actual.actual_total
  `;
  const metadataDrift = await sql<
    {
      actual_original: bigint | null;
      actual_reached_at: Date | string | null;
      expected_original: bigint | null;
      expected_reached_at: Date | string;
      listing_id: string;
    }[]
  >`
    SELECT listing.id AS listing_id,
           listing.original_sponsorship_paise AS actual_original,
           listing.current_total_reached_at AS actual_reached_at,
           (array_agg(ledger.amount_delta_paise ORDER BY ledger.applied_at, ledger.id)
              FILTER (WHERE ledger.entry_type = 'initial_sponsorship'))[1]
             AS expected_original,
           max(ledger.applied_at) AS expected_reached_at
    FROM app.listings AS listing
    JOIN private.financial_ledger AS ledger ON ledger.listing_id = listing.id
    GROUP BY listing.id, listing.original_sponsorship_paise,
             listing.current_total_reached_at
    HAVING listing.original_sponsorship_paise IS DISTINCT FROM
             (array_agg(ledger.amount_delta_paise ORDER BY ledger.applied_at, ledger.id)
                FILTER (WHERE ledger.entry_type = 'initial_sponsorship'))[1]
       OR listing.current_total_reached_at IS DISTINCT FROM max(ledger.applied_at)
  `;
  const lifecycleDrift = await sql<
    {
      actual_lifecycle: string;
      expected_lifecycle: string;
      listing_id: string;
    }[]
  >`
    SELECT listing.id AS listing_id,
           listing.lifecycle_status AS actual_lifecycle,
           CASE WHEN sum(ledger.amount_delta_paise) = 0
                THEN 'inactive_reversed' ELSE 'active' END AS expected_lifecycle
    FROM app.listings AS listing
    JOIN private.financial_ledger AS ledger ON ledger.listing_id = listing.id
    WHERE listing.lifecycle_status <> 'removed'
    GROUP BY listing.id, listing.lifecycle_status
    HAVING listing.lifecycle_status <> CASE
      WHEN sum(ledger.amount_delta_paise) = 0 THEN 'inactive_reversed'
      ELSE 'active' END
  `;

  for (const row of listingDrift) {
    await insertReconciliationItem({
      actual: { confirmedTotalPaise: row.actual_total.toString() },
      discrepancyType: "listing_total_drift",
      expected: { confirmedTotalPaise: row.expected_total.toString() },
      listingId: row.listing_id,
      objectId: row.listing_id,
      runId,
    });
  }
  for (const row of dailyDrift) {
    await insertReconciliationItem({
      actual: { netAmountPaise: row.actual_total?.toString() ?? null },
      discrepancyType: "daily_total_drift",
      expected: { netAmountPaise: row.expected_total?.toString() ?? null },
      listingId: row.listing_id,
      objectId: `${row.listing_id}:${row.business_date}`,
      runId,
    });
  }
  for (const row of metadataDrift) {
    await insertReconciliationItem({
      actual: {
        currentTotalReachedAt: row.actual_reached_at
          ? new Date(row.actual_reached_at).toISOString()
          : null,
        originalSponsorshipPaise: row.actual_original?.toString() ?? null,
      },
      discrepancyType: "listing_financial_metadata_drift",
      expected: {
        currentTotalReachedAt: new Date(row.expected_reached_at).toISOString(),
        originalSponsorshipPaise: row.expected_original?.toString() ?? null,
      },
      listingId: row.listing_id,
      objectId: row.listing_id,
      runId,
    });
  }
  for (const row of lifecycleDrift) {
    await insertReconciliationItem({
      actual: { lifecycleStatus: row.actual_lifecycle },
      discrepancyType: "listing_lifecycle_drift",
      expected: { lifecycleStatus: row.expected_lifecycle },
      listingId: row.listing_id,
      objectId: row.listing_id,
      runId,
    });
  }
  return (
    listingDrift.length +
    dailyDrift.length +
    metadataDrift.length +
    lifecycleDrift.length
  );
}

async function insertReconciliationItem(input: {
  actual: postgres.JSONValue;
  discrepancyType: string;
  expected: postgres.JSONValue;
  listingId: string;
  objectId: string;
  runId: string;
}) {
  const sql = getSqlClient();
  await sql`
    INSERT INTO private.reconciliation_items (
      run_id, provider_object_type, provider_object_id, listing_id,
      discrepancy_type, expected, actual, state
    ) VALUES (
      ${input.runId}, 'projection', ${input.objectId}, ${input.listingId},
      ${input.discrepancyType},
      (${JSON.stringify(input.expected)}::jsonb #>> '{}')::jsonb,
      (${JSON.stringify(input.actual)}::jsonb #>> '{}')::jsonb, 'open'
    ) ON CONFLICT (run_id, provider_object_type, provider_object_id, discrepancy_type)
    DO NOTHING
  `;
}
