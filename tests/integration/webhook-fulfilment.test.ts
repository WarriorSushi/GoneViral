import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { canonicalizeDestination } from "@/domain/destination";
import type { JoinInput } from "@/domain/join";
import { moneyPaise } from "@/domain/money";
import { POLICY_VERSION } from "@/domain/policy";
import { closeDatabase, getSqlClient } from "@/server/db/client";
import { recordCustomerReturn } from "@/server/db/repositories/private/guest-checkout";
import { createGuestCheckout } from "@/server/payments/create-guest-checkout";
import type {
  DodoPaymentStatus,
  NormalizedDodoEvent,
} from "@/server/payments/dodo-webhook";
import { MockDodoProvider } from "@/server/payments/mock-provider";
import { processDodoWebhook } from "@/server/payments/process-dodo-webhook";
import { MockTurnstileVerifier } from "@/server/security/turnstile";

const runtimeDatabaseUrl =
  "postgresql://postgres.pooler-dev:postgres@127.0.0.1:54329/postgres";
const directDatabaseUrl =
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

function clearFixtures() {
  execFileSync(process.execPath, ["scripts/db/phase3-fixtures.mjs", "clear"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_DIRECT_URL: directDatabaseUrl },
    stdio: "pipe",
  });
}

function joinInput(destinationUrl: string): JoinInput {
  const destination = canonicalizeDestination(destinationUrl);
  if (!destination.ok) throw new Error("Test destination must be safe.");
  const id = randomUUID();
  return {
    amountPaise: moneyPaise(49_900n),
    applicationIdempotencyKey: id,
    categorySlug: "tech-apps",
    destination: destination.value,
    email: `phase5-${id}@example.com`,
    name: "Phase Five Integration",
    phone: "+919876543210",
    policyVersion: POLICY_VERSION,
    tagline: "Authoritative Dodo webhook integration verification",
    turnstileToken: `local-pass-${id}`,
  };
}

async function createAttempt(
  providerEnvironment: "mock" | "test_mode" = "mock",
) {
  const mockProvider = new MockDodoProvider("http://localhost:3000");
  const provider =
    providerEnvironment === "mock"
      ? mockProvider
      : {
          createCheckout: mockProvider.createCheckout.bind(mockProvider),
          environment: "test_mode" as const,
          name: "dodo" as const,
          recoverCheckout: mockProvider.recoverCheckout.bind(mockProvider),
          retrieveCheckout: mockProvider.retrieveCheckout.bind(mockProvider),
        };
  const checkout = await createGuestCheckout({
    form: joinInput(`https://phase5-${randomUUID()}.example.com`),
    provider,
    remoteIp: `integration-${randomUUID()}`,
    siteUrl: "http://localhost:3000",
    turnstile: new MockTurnstileVerifier(),
  });
  if (checkout.kind !== "checkout")
    throw new Error("Checkout was not created.");
  const [attempt] = await getSqlClient()<
    { id: string; listing_id: string; provider_order_id: string }[]
  >`
    SELECT id, listing_id, provider_order_id
    FROM private.payment_attempts
    WHERE public_id = ${checkout.publicId}
  `;
  if (!attempt?.provider_order_id)
    throw new Error("Attempt order was not stored.");
  return { ...attempt, publicId: checkout.publicId };
}

function paymentEvent(input: {
  amountPaise?: bigint;
  businessId?: string;
  currency?: string;
  eventType?: string;
  orderId: string;
  paymentId: string;
  publicId: string;
  status?: DodoPaymentStatus | null;
}): NormalizedDodoEvent {
  const now = new Date();
  const status = input.status ?? "succeeded";
  const eventType = input.eventType ?? `payment.${status}`;
  const identity = JSON.stringify(
    { ...input, eventType, status },
    (_key, value: unknown) =>
      typeof value === "bigint" ? value.toString() : value,
  );
  return {
    businessId: input.businessId ?? "mock_business",
    eventType,
    normalizedType: "payment_status",
    payment: {
      amountPaise: input.amountPaise ?? 49_900n,
      attemptPublicId: input.publicId,
      currency: input.currency ?? "INR",
      orderId: input.orderId,
      paymentId: input.paymentId,
      paymentMethod: "mock",
      providerCreatedAt: now,
      providerStatus:
        status === "dropped"
          ? "cancelled"
          : status === "pending"
            ? "processing"
            : status,
      providerUpdatedAt: now,
      status,
    },
    providerCreatedAt: now,
    rawBodyDigest: createHash("sha256").update(identity).digest("hex"),
  };
}

async function processEvent(eventId: string, event: NormalizedDodoEvent) {
  return processDodoWebhook({
    event,
    eventId,
    expectedBusinessId: "mock_business",
    providerEnvironment: "mock",
  });
}

beforeAll(() => {
  process.env.DATABASE_URL = runtimeDatabaseUrl;
  process.env.DATABASE_DIRECT_URL = directDatabaseUrl;
  process.env.DODO_PAYMENTS_ENVIRONMENT = "mock";
  vi.stubEnv("NODE_ENV", "test");
  process.env.SUBMISSION_HMAC_SECRET = "phase5-integration-local-only-secret";
  clearFixtures();
});

afterAll(async () => {
  await closeDatabase();
  clearFixtures();
});

describe("Phase 5 locked Dodo webhook fulfilment", () => {
  it("applies repeated and distinct event IDs for one payment exactly once", async () => {
    const attempt = await createAttempt();
    const event = paymentEvent({
      orderId: attempt.provider_order_id,
      paymentId: `pay_${randomUUID()}`,
      publicId: attempt.publicId,
    });
    const eventId = `evt_${randomUUID()}`;
    const results = await Promise.all([
      processEvent(eventId, event),
      processEvent(eventId, event),
      processEvent(eventId, event),
    ]);
    expect(
      results.filter((result) => result.kind === "processed"),
    ).toHaveLength(1);

    const second = await processEvent(`evt_${randomUUID()}`, {
      ...event,
      rawBodyDigest: createHash("sha256").update(randomUUID()).digest("hex"),
    });
    expect(second.kind).toBe("duplicate");

    const duplicatePaid = await processEvent(
      `evt_${randomUUID()}`,
      paymentEvent({
        orderId: attempt.provider_order_id,
        paymentId: `pay_${randomUUID()}`,
        publicId: attempt.publicId,
      }),
    );
    expect(duplicatePaid).toEqual({
      kind: "quarantined",
      reason: "duplicate_paid",
    });

    const [row] = await getSqlClient()<
      {
        daily_total: bigint;
        ledger_count: bigint;
        ledger_sum: bigint;
        original: bigint;
        outbox_count: bigint;
        timestamps_match: boolean;
        total: bigint;
      }[]
    >`
      SELECT l.confirmed_total_paise AS total,
             l.original_sponsorship_paise AS original,
             (SELECT count(*) FROM private.financial_ledger fl
              WHERE fl.payment_attempt_id = pa.id) AS ledger_count,
             (SELECT sum(amount_delta_paise)::bigint FROM private.financial_ledger fl
              WHERE fl.listing_id = l.id) AS ledger_sum,
             (SELECT sum(net_amount_paise)::bigint FROM app.listing_daily_totals d
              WHERE d.listing_id = l.id) AS daily_total,
             (SELECT count(*) FROM private.email_outbox eo
              WHERE eo.idempotency_key LIKE 'sponsorship-confirmed:' || pa.id || '%')
               AS outbox_count,
             (SELECT fl.applied_business_date =
                       (fl.applied_at AT TIME ZONE 'Asia/Kolkata')::date
                       AND l.current_total_reached_at = fl.applied_at
                       AND d.total_reached_at = fl.applied_at
              FROM private.financial_ledger fl
              JOIN app.listing_daily_totals d
                ON d.last_ledger_entry_id = fl.id
              WHERE fl.payment_attempt_id = pa.id LIMIT 1) AS timestamps_match
      FROM private.payment_attempts pa
      JOIN app.listings l ON l.id = pa.listing_id
      WHERE pa.id = ${attempt.id}
    `;
    expect(row).toMatchObject({
      daily_total: 49_900n,
      ledger_count: 1n,
      ledger_sum: 49_900n,
      original: 49_900n,
      outbox_count: 1n,
      timestamps_match: true,
      total: 49_900n,
    });
  });

  it("quarantines order, currency, business, and environment mismatches", async () => {
    const cases = [
      {
        expected: "order_mismatch",
        mutate: { orderId: `wrong_${randomUUID()}` },
      },
      { expected: "currency_mismatch", mutate: { currency: "USD" } },
      {
        expected: "business_mismatch",
        mutate: { businessId: "wrong_business" },
      },
    ] as const;

    for (const mismatch of cases) {
      const attempt = await createAttempt();
      const result = await processEvent(
        `evt_${randomUUID()}`,
        paymentEvent({
          orderId: attempt.provider_order_id,
          paymentId: `pay_${randomUUID()}`,
          publicId: attempt.publicId,
          ...mismatch.mutate,
        }),
      );
      expect(result).toEqual({
        kind: "quarantined",
        reason: mismatch.expected,
      });
    }

    const environmentAttempt = await createAttempt("test_mode");
    const environmentResult = await processEvent(
      `evt_${randomUUID()}`,
      paymentEvent({
        orderId: environmentAttempt.provider_order_id,
        paymentId: `pay_${randomUUID()}`,
        publicId: environmentAttempt.publicId,
      }),
    );
    expect(environmentResult).toEqual({
      kind: "quarantined",
      reason: "environment_mismatch",
    });
  });

  it("quarantines an authentic unknown event and gives browser return no ledger authority", async () => {
    const attempt = await createAttempt();
    expect(await recordCustomerReturn(attempt.publicId)).toBe(true);
    const unknown: NormalizedDodoEvent = {
      businessId: "mock_business",
      eventType: "payment.future_state",
      normalizedType: "unknown",
      payment: null,
      providerCreatedAt: new Date(),
      rawBodyDigest: createHash("sha256").update(randomUUID()).digest("hex"),
    };
    expect(await processEvent(`evt_${randomUUID()}`, unknown)).toEqual({
      kind: "quarantined",
      reason: "unknown_event_type",
    });
    const [row] = await getSqlClient()<
      { ledger_count: bigint; state: string }[]
    >`
      SELECT state,
             (SELECT count(*) FROM private.financial_ledger fl
              WHERE fl.payment_attempt_id = pa.id) AS ledger_count
      FROM private.payment_attempts pa WHERE id = ${attempt.id}
    `;
    expect(row).toEqual({ ledger_count: 0n, state: "customer_returned" });
  });

  it("durably quarantines an amount mismatch without a ledger entry", async () => {
    const attempt = await createAttempt();
    const result = await processEvent(
      `evt_${randomUUID()}`,
      paymentEvent({
        amountPaise: 50_000n,
        orderId: attempt.provider_order_id,
        paymentId: `pay_${randomUUID()}`,
        publicId: attempt.publicId,
      }),
    );
    expect(result).toEqual({ kind: "quarantined", reason: "amount_mismatch" });
    const [row] = await getSqlClient()<
      { event_state: string; ledger_count: bigint; state: string }[]
    >`
      SELECT pa.state,
             (SELECT count(*) FROM private.financial_ledger fl
              WHERE fl.payment_attempt_id = pa.id) AS ledger_count,
             (SELECT processing_state FROM private.provider_events pe
              WHERE pe.payment_attempt_id = pa.id ORDER BY received_at DESC LIMIT 1)
               AS event_state
      FROM private.payment_attempts pa WHERE pa.id = ${attempt.id}
    `;
    expect(row).toEqual({
      event_state: "quarantined",
      ledger_count: 0n,
      state: "quarantined",
    });
  });

  it("accepts authoritative success after failure or local expiry and never regresses", async () => {
    const attempt = await createAttempt();
    const paymentId = `pay_${randomUUID()}`;
    await processEvent(
      `evt_${randomUUID()}`,
      paymentEvent({
        eventType: "payment.failed",
        orderId: attempt.provider_order_id,
        paymentId,
        publicId: attempt.publicId,
        status: "failed",
      }),
    );
    await getSqlClient()`
      UPDATE private.payment_attempts SET state = 'expired', expired_at = now()
      WHERE id = ${attempt.id}
    `;
    await processEvent(
      `evt_${randomUUID()}`,
      paymentEvent({
        orderId: attempt.provider_order_id,
        paymentId,
        publicId: attempt.publicId,
      }),
    );
    await processEvent(
      `evt_${randomUUID()}`,
      paymentEvent({
        eventType: "payment.failed",
        orderId: attempt.provider_order_id,
        paymentId,
        publicId: attempt.publicId,
        status: "failed",
      }),
    );
    const [row] = await getSqlClient()<
      { ledger_count: bigint; payment_status: string; state: string }[]
    >`
      SELECT pa.state, pp.status AS payment_status,
             (SELECT count(*) FROM private.financial_ledger fl
              WHERE fl.payment_attempt_id = pa.id) AS ledger_count
      FROM private.payment_attempts pa
      JOIN private.provider_payments pp ON pp.payment_attempt_id = pa.id
      WHERE pa.id = ${attempt.id}
    `;
    expect(row).toEqual({
      ledger_count: 1n,
      payment_status: "succeeded",
      state: "succeeded",
    });
  });

  it("records suspended or removed settlements financially and opens operations review", async () => {
    for (const hiddenState of ["suspended", "removed"] as const) {
      const attempt = await createAttempt();
      if (hiddenState === "suspended") {
        await getSqlClient()`
          UPDATE app.listings SET moderation_status = 'suspended'
          WHERE id = ${attempt.listing_id}
        `;
      } else {
        await getSqlClient()`
          UPDATE app.listings SET lifecycle_status = 'removed', removed_at = now()
          WHERE id = ${attempt.listing_id}
        `;
      }
      const result = await processEvent(
        `evt_${randomUUID()}`,
        paymentEvent({
          orderId: attempt.provider_order_id,
          paymentId: `pay_${randomUUID()}`,
          publicId: attempt.publicId,
        }),
      );
      expect(result).toMatchObject({ kind: "processed", mainRank: null });
      const [row] = await getSqlClient()<
        {
          lifecycle: string;
          review_count: bigint;
          state: string;
          total: bigint;
        }[]
      >`
        SELECT pa.state, l.lifecycle_status AS lifecycle,
               l.confirmed_total_paise AS total,
               (SELECT count(*) FROM private.reconciliation_items ri
                WHERE ri.payment_attempt_id = pa.id
                  AND ri.discrepancy_type = 'settled_while_hidden') AS review_count
        FROM private.payment_attempts pa
        JOIN app.listings l ON l.id = pa.listing_id
        WHERE pa.id = ${attempt.id}
      `;
      expect(row).toEqual({
        lifecycle: hiddenState === "removed" ? "removed" : "active",
        review_count: 1n,
        state: "succeeded",
        total: 49_900n,
      });
    }
  });
});
