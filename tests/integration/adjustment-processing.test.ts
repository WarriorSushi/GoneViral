import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";

import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type {
  NormalizedDodoEvent,
  NormalizedProviderAdjustment,
} from "@/server/payments/dodo-webhook";

const directDatabaseUrl =
  process.env.DATABASE_DIRECT_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
process.env.DATABASE_DIRECT_URL ??= directDatabaseUrl;
process.env.DATABASE_URL ??=
  "postgresql://postgres.pooler-dev:postgres@127.0.0.1:54329/postgres";
process.env.PRIVATE_DATA_ENCRYPTION_KEY ??=
  "xtMT1+ly4wVTnz5uDGwQk21jGl4/Ro/GV6z9/imDAdg=";
process.env.SUBMISSION_HMAC_SECRET ??= "phase9-adjustment-integration-secret";

const directSql = postgres(directDatabaseUrl, {
  max: 2,
  prepare: false,
  types: { bigint: postgres.BigInt },
});

type Fixture = {
  attemptId: string;
  listingId: string;
  orderId: string;
  paymentId: string;
  publicAttemptId: string;
  publicListingId: string;
};

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function createBaseFixture(fulfilled: boolean): Promise<Fixture> {
  const suffix = randomUUID();
  const publicAttemptId = `att_${suffix.replaceAll("-", "").slice(0, 24)}`;
  const publicListingId = `phase9-listing-${suffix}`;
  const orderId = `phase9-order-${suffix}`;
  const paymentId = `phase9-payment-${suffix}`;
  const [listing] = await directSql<{ id: string }[]>`
    INSERT INTO app.listings (
      public_id, slug, name, name_normalized, tagline, destination_url,
      destination_canonical_key, destination_host, category_id,
      lifecycle_status, moderation_status, confirmed_total_paise,
      original_sponsorship_paise, current_total_reached_at,
      first_confirmed_at, category_locked_at
    ) VALUES (
      ${publicListingId}, ${`phase9-${suffix}`}, 'Phase 9 adjustment fixture',
      'phase 9 adjustment fixture', 'Provider adjustment integration test',
      ${`https://phase9-${suffix}.example.test`},
      ${`https://phase9-${suffix}.example.test`},
      ${`phase9-${suffix}.example.test`},
      '00000000-0000-4000-8000-000000000002',
      ${fulfilled ? "active" : "payment_pending"}, 'clear',
      ${fulfilled ? 49_900 : 0}, ${fulfilled ? 49_900 : null},
      ${fulfilled ? new Date(Date.now() - 86_400_000).toISOString() : null},
      ${fulfilled ? new Date(Date.now() - 86_400_000).toISOString() : null},
      ${fulfilled ? new Date(Date.now() - 86_400_000).toISOString() : null}
    ) RETURNING id
  `;
  if (!listing) throw new Error("Phase 9 listing fixture missing.");
  const email = `phase9-${suffix}@example.test`;
  const [pending] = await directSql<{ id: string }[]>`
    INSERT INTO private.pending_listing_owners (
      listing_id, canonical_email, email_hash, claim_state
    ) VALUES (${listing.id}, ${email}, ${digest(email)}, 'pending') RETURNING id
  `;
  const [attempt] = await directSql<{ id: string }[]>`
    INSERT INTO private.payment_attempts (
      public_id, application_idempotency_key, provider,
      provider_environment, provider_order_id, provider_checkout_session_id,
      listing_id, purpose, state, amount_paise, currency, policy_version,
      minimum_required_paise_snapshot, listing_total_paise_snapshot,
      pending_owner_id, provider_order_request_hash, customer_phone_e164,
      terms_version, privacy_version, refund_policy_version,
      content_policy_version, checkout_expires_at
    ) VALUES (
      ${publicAttemptId}, ${`phase9-key-${suffix}`}, 'dodo', 'mock',
      ${orderId}, ${orderId}, ${listing.id}, 'initial_sponsorship',
      'checkout_ready', 49900, 'INR', 'phase9-test', 49900, 0,
      ${pending!.id}, ${digest(suffix)}, '+919876543210', 'phase9-test',
      'phase9-test', 'phase9-test', 'phase9-test', now() + interval '1 hour'
    ) RETURNING id
  `;
  if (!attempt) throw new Error("Phase 9 attempt fixture missing.");
  await directSql`
    UPDATE private.pending_listing_owners SET created_from_attempt_id = ${attempt.id}
    WHERE id = ${pending!.id}
  `;
  if (fulfilled) {
    await directSql`
      INSERT INTO private.provider_payments (
        provider, provider_environment, provider_payment_id,
        provider_order_id, payment_attempt_id, amount_paise, currency,
        status, settled_at
      ) VALUES (
        'dodo', 'mock', ${paymentId}, ${orderId}, ${attempt.id},
        49900, 'INR', 'succeeded', now() - interval '1 day'
      )
    `;
    const [ledger] = await directSql<
      { applied_at: Date | string; applied_business_date: string; id: string }[]
    >`
      INSERT INTO private.financial_ledger (
        listing_id, entry_type, amount_delta_paise, currency,
        payment_attempt_id, provider_payment_id, policy_version,
        applied_at, applied_business_date, provider_effective_at,
        source_key, source_provider, source_environment
      ) VALUES (
        ${listing.id}, 'initial_sponsorship', 49900, 'INR', ${attempt.id},
        ${paymentId}, 'phase9-test', now() - interval '1 day',
        ((now() - interval '1 day') AT TIME ZONE 'Asia/Kolkata')::date,
        now() - interval '1 day', ${`phase9-positive-${suffix}`},
        'dodo', 'mock'
      ) RETURNING id, applied_at, applied_business_date
    `;
    await directSql`
      UPDATE private.payment_attempts
      SET state = 'succeeded', fulfilled_ledger_entry_id = ${ledger!.id},
          succeeded_at = ${new Date(ledger!.applied_at).toISOString()}
      WHERE id = ${attempt.id}
    `;
    await directSql`
      UPDATE private.provider_payments SET fulfilled_ledger_entry_id = ${ledger!.id}
      WHERE provider_payment_id = ${paymentId}
    `;
    await directSql`
      INSERT INTO app.listing_daily_totals (
        listing_id, business_date, net_amount_paise, total_reached_at,
        last_ledger_entry_id
      ) VALUES (
        ${listing.id}, ${ledger!.applied_business_date}, 49900,
        ${new Date(ledger!.applied_at).toISOString()}, ${ledger!.id}
      )
    `;
  }
  return {
    attemptId: attempt.id,
    listingId: listing.id,
    orderId,
    paymentId,
    publicAttemptId,
    publicListingId,
  };
}

function adjustmentEvent(input: {
  adjustmentId?: string;
  amountPaise: bigint;
  desiredEffectiveDelta?: bigint;
  kind?: "chargeback" | "refund";
  paymentId: string;
  status?: string;
  updatedAt?: Date;
}): NormalizedDodoEvent {
  const kind = input.kind ?? "refund";
  const updatedAt = input.updatedAt ?? new Date();
  const adjustment: NormalizedProviderAdjustment = {
    adjustmentId: input.adjustmentId ?? `phase9-adjustment-${randomUUID()}`,
    amountPaise: input.amountPaise,
    currency: "INR",
    desiredEffectiveDelta: input.desiredEffectiveDelta ?? -input.amountPaise,
    kind,
    paymentId: input.paymentId,
    providerCreatedAt: updatedAt,
    providerUpdatedAt: updatedAt,
    status:
      input.status ?? (kind === "refund" ? "succeeded" : "dispute_opened"),
  };
  return {
    adjustment,
    businessId: "mock_business",
    eventType: kind === "refund" ? "refund.succeeded" : "dispute.opened",
    normalizedType: "adjustment_status",
    payment: null,
    providerCreatedAt: updatedAt,
    rawBodyDigest: digest(
      `${adjustment.adjustmentId}:${updatedAt.toISOString()}`,
    ),
  };
}

function paymentEvent(fixture: Fixture): NormalizedDodoEvent {
  const now = new Date();
  return {
    adjustment: null,
    businessId: "mock_business",
    eventType: "payment.succeeded",
    normalizedType: "payment_status",
    payment: {
      amountPaise: 49_900n,
      attemptPublicId: fixture.publicAttemptId,
      currency: "INR",
      orderId: fixture.orderId,
      paymentId: fixture.paymentId,
      paymentMethod: "card",
      providerCreatedAt: now,
      providerStatus: "succeeded",
      providerUpdatedAt: now,
      status: "succeeded",
    },
    providerCreatedAt: now,
    rawBodyDigest: digest(`payment:${fixture.paymentId}`),
  };
}

async function processEvent(event: NormalizedDodoEvent) {
  const { processDodoWebhook } =
    await import("@/server/payments/process-dodo-webhook");
  return processDodoWebhook({
    event,
    eventId: `phase9-event-${randomUUID()}`,
    expectedBusinessId: "mock_business",
    providerEnvironment: "mock",
  });
}

async function cleanup() {
  const listings = await directSql<{ id: string }[]>`
    SELECT id FROM app.listings WHERE name = 'Phase 9 adjustment fixture'
  `;
  const listingIds = listings.map((row) => row.id);
  if (listingIds.length === 0) return;
  const attempts = await directSql<{ id: string }[]>`
    SELECT id FROM private.payment_attempts
    WHERE listing_id = ANY(${listingIds}::uuid[])
  `;
  const attemptIds = attempts.map((row) => row.id);
  const runs = await directSql<{ run_id: string }[]>`
    SELECT DISTINCT run_id FROM private.reconciliation_items
    WHERE listing_id = ANY(${listingIds}::uuid[])
       OR payment_attempt_id = ANY(${attemptIds}::uuid[])
       OR provider_object_id LIKE 'phase9-%'
  `;
  const runIds = runs.map((row) => row.run_id);
  if (runIds.length > 0) {
    await directSql`DELETE FROM private.reconciliation_items WHERE run_id = ANY(${runIds}::uuid[])`;
    await directSql`DELETE FROM private.reconciliation_runs WHERE id = ANY(${runIds}::uuid[])`;
  }
  await directSql`
    DELETE FROM private.email_outbox
    WHERE payload ->> 'listingPublicId' LIKE 'phase9-listing-%'
  `;
  await directSql`
    DELETE FROM private.provider_events
    WHERE provider_event_id LIKE 'phase9-event-%'
       OR payment_attempt_id = ANY(${attemptIds}::uuid[])
  `;
  await directSql`
    DELETE FROM private.provider_adjustments
    WHERE listing_id = ANY(${listingIds}::uuid[])
       OR provider_adjustment_id LIKE 'phase9-adjustment-%'
  `;
  await directSql`
    UPDATE private.payment_attempts SET fulfilled_ledger_entry_id = NULL,
      state = 'failed', succeeded_at = NULL
    WHERE id = ANY(${attemptIds}::uuid[])
  `;
  await directSql`
    UPDATE private.provider_payments SET fulfilled_ledger_entry_id = NULL
    WHERE payment_attempt_id = ANY(${attemptIds}::uuid[])
  `;
  await directSql`DELETE FROM app.listing_daily_totals WHERE listing_id = ANY(${listingIds}::uuid[])`;
  await directSql`ALTER TABLE private.financial_ledger DISABLE TRIGGER financial_ledger_append_only`;
  await directSql`DELETE FROM private.financial_ledger WHERE listing_id = ANY(${listingIds}::uuid[])`;
  await directSql`ALTER TABLE private.financial_ledger ENABLE TRIGGER financial_ledger_append_only`;
  await directSql`DELETE FROM private.provider_payments WHERE payment_attempt_id = ANY(${attemptIds}::uuid[])`;
  await directSql`
    UPDATE private.pending_listing_owners SET created_from_attempt_id = NULL
    WHERE listing_id = ANY(${listingIds}::uuid[])
  `;
  await directSql`DELETE FROM private.payment_attempts WHERE id = ANY(${attemptIds}::uuid[])`;
  await directSql`DELETE FROM private.pending_listing_owners WHERE listing_id = ANY(${listingIds}::uuid[])`;
  await directSql`DELETE FROM app.listings WHERE id = ANY(${listingIds}::uuid[])`;
}

beforeAll(cleanup);

afterAll(async () => {
  await cleanup();
  const { closeDatabase } = await import("@/server/db/client");
  await closeDatabase();
  await directSql.end({ timeout: 5 });
});

describe("Phase 9 provider adjustment application", () => {
  it("applies a partial refund today without rewriting the original day", async () => {
    const fixture = await createBaseFixture(true);
    const before = await directSql<{ current_total_reached_at: Date }[]>`
      SELECT current_total_reached_at FROM app.listings WHERE id = ${fixture.listingId}
    `;
    await expect(
      processEvent(
        adjustmentEvent({ amountPaise: 40_000n, paymentId: fixture.paymentId }),
      ),
    ).resolves.toMatchObject({
      kind: "processed",
      listingPublicId: fixture.publicListingId,
    });
    const rows = await directSql`
      SELECT listing.confirmed_total_paise AS total,
             listing.original_sponsorship_paise AS original,
             listing.lifecycle_status,
             listing.current_total_reached_at,
             (SELECT count(*) FROM private.financial_ledger ledger
              WHERE ledger.listing_id = listing.id AND ledger.entry_type = 'refund') AS refund_count,
             (SELECT net_amount_paise FROM app.listing_daily_totals daily
              WHERE daily.listing_id = listing.id
                AND daily.business_date = (now() AT TIME ZONE 'Asia/Kolkata')::date) AS today_delta,
             (SELECT net_amount_paise FROM app.listing_daily_totals daily
              WHERE daily.listing_id = listing.id
                AND daily.business_date < (now() AT TIME ZONE 'Asia/Kolkata')::date
              ORDER BY daily.business_date DESC LIMIT 1) AS historical_total
      FROM app.listings AS listing WHERE listing.id = ${fixture.listingId}
    `;
    expect(rows[0]).toMatchObject({
      historical_total: 49_900n,
      lifecycle_status: "active",
      original: 49_900n,
      refund_count: 1n,
      today_delta: -40_000n,
      total: 9_900n,
    });
    expect(
      new Date(rows[0]!.current_total_reached_at).getTime(),
    ).toBeGreaterThan(new Date(before[0]!.current_total_reached_at).getTime());
  });

  it("applies a full chargeback, restores it once, and preserves history", async () => {
    const fixture = await createBaseFixture(true);
    const adjustmentId = `phase9-adjustment-${randomUUID()}`;
    const openedAt = new Date();
    const opened = adjustmentEvent({
      adjustmentId,
      amountPaise: 49_900n,
      kind: "chargeback",
      paymentId: fixture.paymentId,
      updatedAt: openedAt,
    });
    await expect(processEvent(opened)).resolves.toMatchObject({
      kind: "processed",
    });
    await expect(processEvent(opened)).resolves.toMatchObject({
      kind: "duplicate",
    });
    const won = adjustmentEvent({
      adjustmentId,
      amountPaise: 49_900n,
      desiredEffectiveDelta: 0n,
      kind: "chargeback",
      paymentId: fixture.paymentId,
      status: "dispute_won",
      updatedAt: new Date(openedAt.getTime() + 1_000),
    });
    await expect(processEvent(won)).resolves.toMatchObject({
      kind: "processed",
    });
    await expect(processEvent(won)).resolves.toMatchObject({
      kind: "duplicate",
    });
    const [row] = await directSql`
      SELECT listing.confirmed_total_paise AS total,
             listing.original_sponsorship_paise AS original,
             listing.lifecycle_status,
             adjustment.currently_applied_delta,
             (SELECT array_agg(entry_type ORDER BY applied_at, id)
              FROM private.financial_ledger
              WHERE listing_id = listing.id) AS entries
      FROM app.listings AS listing
      JOIN private.provider_adjustments AS adjustment
        ON adjustment.listing_id = listing.id
      WHERE listing.id = ${fixture.listingId}
    `;
    expect(row).toMatchObject({
      currently_applied_delta: 0n,
      entries: ["initial_sponsorship", "chargeback", "chargeback_restoration"],
      lifecycle_status: "active",
      original: 49_900n,
      total: 49_900n,
    });
  });

  it("quarantines aggregate over-refunds before the listing can go negative", async () => {
    const fixture = await createBaseFixture(true);
    await processEvent(
      adjustmentEvent({ amountPaise: 30_000n, paymentId: fixture.paymentId }),
    );
    const result = await processEvent(
      adjustmentEvent({ amountPaise: 30_000n, paymentId: fixture.paymentId }),
    );
    expect(result).toEqual({
      kind: "quarantined",
      reason: "aggregate_reversal_exceeds_payment",
    });
    const [row] = await directSql`
      SELECT listing.confirmed_total_paise AS total,
             (SELECT count(*) FROM private.financial_ledger ledger
              WHERE ledger.listing_id = listing.id AND ledger.amount_delta_paise < 0)
               AS negative_count,
             (SELECT count(*) FROM private.reconciliation_items item
              WHERE item.listing_id = listing.id AND item.state = 'open') AS open_items
      FROM app.listings AS listing WHERE listing.id = ${fixture.listingId}
    `;
    expect(row).toEqual({ negative_count: 1n, open_items: 1n, total: 19_900n });
  });

  it("serializes concurrent adjustments for one provider payment", async () => {
    const fixture = await createBaseFixture(true);
    const results = await Promise.all([
      processEvent(
        adjustmentEvent({
          adjustmentId: `phase9-adjustment-${randomUUID()}`,
          amountPaise: 30_000n,
          paymentId: fixture.paymentId,
        }),
      ),
      processEvent(
        adjustmentEvent({
          adjustmentId: `phase9-adjustment-${randomUUID()}`,
          amountPaise: 30_000n,
          paymentId: fixture.paymentId,
        }),
      ),
    ]);
    expect(results.map((result) => result.kind).sort()).toEqual([
      "processed",
      "quarantined",
    ]);
    const [row] = await directSql`
      SELECT confirmed_total_paise AS total FROM app.listings
      WHERE id = ${fixture.listingId}
    `;
    expect(row!.total).toBe(19_900n);
  });

  it("records a duplicate-paid refund without subtracting legitimate sponsorship", async () => {
    const fixture = await createBaseFixture(true);
    const duplicatePaymentId = `phase9-duplicate-payment-${randomUUID()}`;
    await directSql`
      INSERT INTO private.provider_payments (
        provider, provider_environment, provider_payment_id,
        provider_order_id, payment_attempt_id, amount_paise, currency, status,
        settled_at
      ) VALUES (
        'dodo', 'mock', ${duplicatePaymentId}, ${fixture.orderId},
        ${fixture.attemptId}, 49900, 'INR', 'succeeded', now()
      )
    `;
    await expect(
      processEvent(
        adjustmentEvent({
          amountPaise: 49_900n,
          paymentId: duplicatePaymentId,
        }),
      ),
    ).resolves.toMatchObject({
      kind: "quarantined",
      reason: "adjustment_unfulfilled_payment",
    });
    const [row] = await directSql`
      SELECT listing.confirmed_total_paise AS total,
             adjustment.rank_effect_eligible,
             adjustment.currently_applied_delta
      FROM app.listings AS listing
      JOIN private.provider_adjustments AS adjustment
        ON adjustment.listing_id = listing.id
      WHERE listing.id = ${fixture.listingId}
        AND adjustment.provider_payment_id = ${duplicatePaymentId}
    `;
    expect(row).toEqual({
      currently_applied_delta: 0n,
      rank_effect_eligible: false,
      total: 49_900n,
    });
  });

  it("converges when a full refund arrives before its payment success", async () => {
    const fixture = await createBaseFixture(false);
    const earlyRefund = adjustmentEvent({
      amountPaise: 49_900n,
      paymentId: fixture.paymentId,
    });
    await expect(processEvent(earlyRefund)).resolves.toMatchObject({
      kind: "quarantined",
      reason: "adjustment_payment_not_found",
    });
    await expect(processEvent(paymentEvent(fixture))).resolves.toMatchObject({
      kind: "processed",
      listingPublicId: fixture.publicListingId,
    });
    const [row] = await directSql`
      SELECT listing.confirmed_total_paise AS total,
             listing.original_sponsorship_paise AS original,
             listing.lifecycle_status,
             adjustment.currently_applied_delta,
             (SELECT count(*) FROM private.financial_ledger ledger
              WHERE ledger.listing_id = listing.id) AS ledger_count,
             (SELECT count(*) FROM private.reconciliation_items item
              WHERE item.provider_object_id = adjustment.provider_adjustment_id
                AND item.state = 'resolved') AS resolved_items
      FROM app.listings AS listing
      JOIN private.provider_adjustments AS adjustment
        ON adjustment.listing_id = listing.id
      WHERE listing.id = ${fixture.listingId}
    `;
    expect(row).toEqual({
      currently_applied_delta: -49_900n,
      ledger_count: 2n,
      lifecycle_status: "inactive_reversed",
      original: 49_900n,
      resolved_items: 1n,
      total: 0n,
    });
  });

  it("recovers a missing payment success through the normal fulfilment service", async () => {
    const fixture = await createBaseFixture(false);
    const event = paymentEvent(fixture);
    const { runPaymentReconciliation } =
      await import("@/server/payments/reconciliation");
    const summary = await runPaymentReconciliation({
      source: {
        async listObservations() {
          return [
            {
              event,
              providerObjectId: fixture.paymentId,
              providerObjectType: "payment" as const,
            },
          ];
        },
      },
    });
    expect(summary).toMatchObject({ applied: 1, failed: 0, quarantined: 0 });
    const [row] = await directSql`
      SELECT confirmed_total_paise AS total, original_sponsorship_paise AS original,
             lifecycle_status
      FROM app.listings WHERE id = ${fixture.listingId}
    `;
    expect(row).toEqual({
      lifecycle_status: "active",
      original: 49_900n,
      total: 49_900n,
    });
  });

  it("detects drift and repairs projections exclusively from the ledger", async () => {
    const fixture = await createBaseFixture(true);
    await directSql`
      UPDATE app.listings
      SET confirmed_total_paise = 12_300, lifecycle_status = 'payment_pending',
          current_total_reached_at = now()
      WHERE id = ${fixture.listingId}
    `;
    await directSql`
      UPDATE app.listing_daily_totals SET net_amount_paise = 12_300
      WHERE listing_id = ${fixture.listingId}
    `;
    const { EmptyReconciliationSource, runPaymentReconciliation } =
      await import("@/server/payments/reconciliation");
    const summary = await runPaymentReconciliation({
      source: new EmptyReconciliationSource(),
    });
    expect(summary.discrepancies).toBeGreaterThanOrEqual(3);

    const repairEnvironment = {
      ...process.env,
      DATABASE_DIRECT_URL: directDatabaseUrl,
    };
    const dryRun = JSON.parse(
      execFileSync(
        process.execPath,
        [
          "scripts/db/repair-projections.mjs",
          "--listing",
          fixture.listingId,
          "--reason",
          "Phase 9 integration repair dry run",
        ],
        { cwd: process.cwd(), encoding: "utf8", env: repairEnvironment },
      ),
    );
    expect(dryRun.applied).toBe(false);
    const [stillDrifted] = await directSql`
      SELECT confirmed_total_paise AS total FROM app.listings
      WHERE id = ${fixture.listingId}
    `;
    expect(stillDrifted!.total).toBe(12_300n);

    const applied = JSON.parse(
      execFileSync(
        process.execPath,
        [
          "scripts/db/repair-projections.mjs",
          "--listing",
          fixture.listingId,
          "--reason",
          "Phase 9 integration repair application",
          "--apply",
        ],
        { cwd: process.cwd(), encoding: "utf8", env: repairEnvironment },
      ),
    );
    expect(applied.applied).toBe(true);
    const [repaired] = await directSql`
      SELECT listing.confirmed_total_paise AS total, listing.lifecycle_status,
             daily.net_amount_paise AS daily_total,
             (SELECT count(*) FROM private.financial_ledger ledger
              WHERE ledger.listing_id = listing.id) AS ledger_count
      FROM app.listings AS listing
      JOIN app.listing_daily_totals AS daily ON daily.listing_id = listing.id
      WHERE listing.id = ${fixture.listingId}
    `;
    expect(repaired).toEqual({
      daily_total: 49_900n,
      ledger_count: 1n,
      lifecycle_status: "active",
      total: 49_900n,
    });
  });
});
