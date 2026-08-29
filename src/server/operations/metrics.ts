import "server-only";

import { getSqlClient } from "@/server/db/client";

export type OperationalMetrics = Readonly<{
  abuse: readonly Readonly<{
    activeBuckets: string;
    observedCount: string;
    scope: string;
  }>[];
  emailBacklog: string;
  emailDeadLetters: string;
  lastProviderEventAt: string | null;
  ledgerProjectionMismatches: string;
  openReconciliationItems: string;
  providerQuarantines: string;
  stalePendingAttempts: string;
}>;

export type OperationalAlert = Readonly<{
  code: string;
  severity: "critical" | "warning";
  value: string;
}>;

export async function collectOperationalMetrics(): Promise<OperationalMetrics> {
  const sql = getSqlClient();
  const [row] = await sql<
    {
      email_backlog: bigint;
      email_dead_letters: bigint;
      last_provider_event_at: Date | string | null;
      ledger_projection_mismatches: bigint;
      open_reconciliation_items: bigint;
      provider_quarantines: bigint;
      stale_pending_attempts: bigint;
    }[]
  >`
    WITH ledger_sums AS (
      SELECT listing_id, sum(amount_delta_paise) AS total
      FROM private.financial_ledger GROUP BY listing_id
    ), daily_sums AS (
      SELECT listing_id, applied_business_date AS business_date,
             sum(amount_delta_paise) AS total
      FROM private.financial_ledger
      GROUP BY listing_id, applied_business_date
    ), projection_mismatches AS (
      SELECT listing.id
      FROM app.listings AS listing
      LEFT JOIN ledger_sums ON ledger_sums.listing_id = listing.id
      WHERE listing.confirmed_total_paise <> COALESCE(ledger_sums.total, 0)
      UNION ALL
      SELECT COALESCE(daily.listing_id, projected.listing_id)
      FROM daily_sums AS daily
      FULL JOIN app.listing_daily_totals AS projected
        ON projected.listing_id = daily.listing_id
       AND projected.business_date = daily.business_date
      WHERE COALESCE(daily.total, 0) <> COALESCE(projected.net_amount_paise, 0)
    )
    SELECT
      (SELECT count(*) FROM private.email_outbox
       WHERE state IN ('pending', 'sending', 'failed_retryable'))::bigint
        AS email_backlog,
      (SELECT count(*) FROM private.email_outbox
       WHERE state = 'dead_letter')::bigint AS email_dead_letters,
      (SELECT max(received_at) FROM private.provider_events)
        AS last_provider_event_at,
      (SELECT count(*) FROM projection_mismatches)::bigint
        AS ledger_projection_mismatches,
      (SELECT count(*) FROM private.reconciliation_items
       WHERE state IN ('open', 'investigating'))::bigint
        AS open_reconciliation_items,
      (SELECT count(*) FROM private.provider_events
       WHERE processing_state = 'quarantined'
         AND received_at >= transaction_timestamp() - interval '24 hours')::bigint
        AS provider_quarantines,
      (SELECT count(*) FROM private.payment_attempts
       WHERE state IN (
         'intent_created', 'provider_order_pending', 'checkout_ready',
         'customer_returned', 'provider_pending'
       ) AND created_at < transaction_timestamp() - interval '30 minutes')::bigint
        AS stale_pending_attempts
  `;
  if (!row) throw new Error("operational_metrics_unavailable");

  const abuseRows = await sql<
    { active_buckets: bigint; observed_count: bigint; scope: string }[]
  >`
    SELECT scope, count(*)::bigint AS active_buckets,
           sum(count)::bigint AS observed_count
    FROM private.rate_limit_buckets
    WHERE expires_at > transaction_timestamp()
    GROUP BY scope ORDER BY scope
  `;

  return {
    abuse: abuseRows.map((item) => ({
      activeBuckets: item.active_buckets.toString(),
      observedCount: item.observed_count.toString(),
      scope: item.scope,
    })),
    emailBacklog: row.email_backlog.toString(),
    emailDeadLetters: row.email_dead_letters.toString(),
    lastProviderEventAt: row.last_provider_event_at
      ? new Date(row.last_provider_event_at).toISOString()
      : null,
    ledgerProjectionMismatches: row.ledger_projection_mismatches.toString(),
    openReconciliationItems: row.open_reconciliation_items.toString(),
    providerQuarantines: row.provider_quarantines.toString(),
    stalePendingAttempts: row.stale_pending_attempts.toString(),
  };
}

export function evaluateOperationalHealth(
  metrics: OperationalMetrics,
): readonly OperationalAlert[] {
  const alerts: OperationalAlert[] = [];
  const addWhenPositive = (
    value: string,
    code: string,
    severity: OperationalAlert["severity"],
  ) => {
    if (BigInt(value) > 0n) alerts.push({ code, severity, value });
  };
  addWhenPositive(
    metrics.ledgerProjectionMismatches,
    "ledger_projection_mismatch",
    "critical",
  );
  addWhenPositive(
    metrics.providerQuarantines,
    "provider_event_quarantine",
    "critical",
  );
  addWhenPositive(
    metrics.openReconciliationItems,
    "reconciliation_items_open",
    "warning",
  );
  addWhenPositive(metrics.emailDeadLetters, "email_dead_letter", "warning");
  addWhenPositive(
    metrics.stalePendingAttempts,
    "payment_attempt_stale",
    "warning",
  );
  if (BigInt(metrics.emailBacklog) > 100n) {
    alerts.push({
      code: "email_backlog_high",
      severity: "warning",
      value: metrics.emailBacklog,
    });
  }
  return alerts;
}
