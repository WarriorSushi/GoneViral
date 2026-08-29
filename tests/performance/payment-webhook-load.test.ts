import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { canonicalizeDestination } from "@/domain/destination";
import type { JoinInput } from "@/domain/join";
import { moneyPaise } from "@/domain/money";
import { POLICY_VERSION } from "@/domain/policy";
import { closeDatabase, getSqlClient } from "@/server/db/client";
import { createGuestCheckout } from "@/server/payments/create-guest-checkout";
import type { NormalizedDodoEvent } from "@/server/payments/dodo-webhook";
import { MockDodoProvider } from "@/server/payments/mock-provider";
import { processDodoWebhook } from "@/server/payments/process-dodo-webhook";
import { MockTurnstileVerifier } from "@/server/security/turnstile";

const runtimeDatabaseUrl =
  "postgresql://postgres.pooler-dev:postgres@127.0.0.1:54329/postgres";
const directDatabaseUrl =
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const attemptCount = 24;
const batchSize = 6;
const outputPath = path.resolve(
  "artifacts/phase14-performance/payment-webhook-load.json",
);

function clearFixtures() {
  execFileSync(process.execPath, ["scripts/db/phase3-fixtures.mjs", "clear"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_DIRECT_URL: directDatabaseUrl },
    stdio: "pipe",
  });
}

function percentile(values: readonly number[], fraction: number) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
}

function joinInput(destinationUrl: string): JoinInput {
  const destination = canonicalizeDestination(destinationUrl);
  if (!destination.ok) throw new Error("Load fixture destination is unsafe.");
  const id = randomUUID();
  return {
    amountPaise: moneyPaise(49_900n),
    applicationIdempotencyKey: id,
    categorySlug: "tech-apps",
    destination: destination.value,
    email: `phase14-load-${id}@example.com`,
    name: `Phase 14 Load ${id.slice(0, 8)}`,
    phone: "+919876543210",
    policyVersion: POLICY_VERSION,
    tagline: "Strictly local synthetic payment load verification",
    targetSlug: null,
    turnstileToken: `local-pass-${id}`,
  };
}

async function createAttempt() {
  const provider = new MockDodoProvider("http://localhost:3000");
  const checkout = await createGuestCheckout({
    form: joinInput(`https://phase14-load-${randomUUID()}.example.com`),
    provider,
    remoteIp: `phase14-load-${randomUUID()}`,
    siteUrl: "http://localhost:3000",
    turnstile: new MockTurnstileVerifier(),
  });
  if (checkout.kind !== "checkout") {
    throw new Error(`Load checkout was not created: ${checkout.kind}`);
  }
  const [attempt] = await getSqlClient()<
    { id: string; listing_id: string; provider_order_id: string }[]
  >`
    SELECT id, listing_id, provider_order_id
    FROM private.payment_attempts WHERE public_id = ${checkout.publicId}
  `;
  if (!attempt?.provider_order_id) throw new Error("Load attempt is missing.");
  return { ...attempt, publicId: checkout.publicId };
}

function paymentEvent(input: {
  orderId: string;
  paymentId: string;
  publicId: string;
}): NormalizedDodoEvent {
  const now = new Date();
  const identity = JSON.stringify(input);
  return {
    businessId: "mock_business",
    eventType: "payment.succeeded",
    normalizedType: "payment_status",
    payment: {
      amountPaise: 49_900n,
      attemptPublicId: input.publicId,
      currency: "INR",
      orderId: input.orderId,
      paymentId: input.paymentId,
      paymentMethod: "mock",
      providerCreatedAt: now,
      providerStatus: "succeeded",
      providerUpdatedAt: now,
      status: "succeeded",
    },
    providerCreatedAt: now,
    rawBodyDigest: createHash("sha256").update(identity).digest("hex"),
  };
}

async function timedProcess(eventId: string, event: NormalizedDodoEvent) {
  const startedAt = performance.now();
  const result = await processDodoWebhook({
    event,
    eventId,
    expectedBusinessId: "mock_business",
    providerEnvironment: "mock",
  });
  return { durationMs: performance.now() - startedAt, result };
}

beforeAll(() => {
  process.env.DATABASE_URL = runtimeDatabaseUrl;
  process.env.DATABASE_DIRECT_URL = directDatabaseUrl;
  process.env.DODO_PAYMENTS_ENVIRONMENT = "mock";
  process.env.SUBMISSION_HMAC_SECRET =
    "phase14-load-integration-local-only-secret";
  vi.stubEnv("NODE_ENV", "test");
  clearFixtures();
});

afterAll(async () => {
  clearFixtures();
  await closeDatabase();
});

describe("Phase 14 local payment-webhook load", () => {
  it("keeps concurrent distinct fulfilments and a duplicate storm exact and bounded", async () => {
    const attempts = [];
    for (let index = 0; index < attemptCount; index += 1) {
      attempts.push(await createAttempt());
    }

    const distinctDurations = [];
    const distinctResults = [];
    for (let offset = 0; offset < attempts.length; offset += batchSize) {
      const batch = attempts.slice(offset, offset + batchSize);
      const outcomes = await Promise.all(
        batch.map((attempt) =>
          timedProcess(
            `evt_phase14_${randomUUID()}`,
            paymentEvent({
              orderId: attempt.provider_order_id,
              paymentId: `pay_phase14_${randomUUID()}`,
              publicId: attempt.publicId,
            }),
          ),
        ),
      );
      distinctDurations.push(...outcomes.map((outcome) => outcome.durationMs));
      distinctResults.push(...outcomes.map((outcome) => outcome.result.kind));
    }
    expect(distinctResults).toEqual(Array(attemptCount).fill("processed"));

    const duplicateAttempt = attempts[0];
    if (!duplicateAttempt)
      throw new Error("Duplicate load fixture is missing.");
    const duplicateEvent = paymentEvent({
      orderId: duplicateAttempt.provider_order_id,
      paymentId: `pay_phase14_duplicate_${randomUUID()}`,
      publicId: duplicateAttempt.publicId,
    });
    const duplicateEventId = `evt_phase14_duplicate_${randomUUID()}`;
    const duplicateOutcomes = await Promise.all(
      Array.from({ length: attemptCount }, () =>
        timedProcess(duplicateEventId, duplicateEvent),
      ),
    );
    const duplicateKinds = duplicateOutcomes.map(
      (outcome) => outcome.result.kind,
    );
    // The attempt was already fulfilled by the distinct load, so every new
    // payment identity is safely quarantined or deduplicated, never applied.
    expect(duplicateKinds.filter((kind) => kind === "processed")).toHaveLength(
      0,
    );
    expect(
      duplicateKinds.every(
        (kind) => kind === "quarantined" || kind === "duplicate",
      ),
    ).toBe(true);

    const [databaseState] = await getSqlClient()<
      { attempts: bigint; ledger_entries: bigint; succeeded: bigint }[]
    >`
      SELECT count(*)::bigint AS attempts,
             count(*) FILTER (WHERE state = 'succeeded')::bigint AS succeeded,
             (SELECT count(*)::bigint FROM private.financial_ledger)
               AS ledger_entries
      FROM private.payment_attempts
    `;
    if (!databaseState) throw new Error("Load database state is missing.");
    expect(databaseState).toEqual({
      attempts: BigInt(attemptCount),
      ledger_entries: BigInt(attemptCount),
      succeeded: BigInt(attemptCount),
    });

    const evidence = {
      concurrency: {
        batchSize,
        distinctAttempts: attemptCount,
        duplicateCalls: attemptCount,
      },
      distinctFulfilment: {
        maximumMs: Math.max(...distinctDurations),
        p50Ms: percentile(distinctDurations, 0.5),
        p95Ms: percentile(distinctDurations, 0.95),
      },
      duplicateStorm: {
        maximumMs: Math.max(
          ...duplicateOutcomes.map((outcome) => outcome.durationMs),
        ),
        p95Ms: percentile(
          duplicateOutcomes.map((outcome) => outcome.durationMs),
          0.95,
        ),
      },
      generatedAt: new Date().toISOString(),
      method:
        "Strictly local mock-provider normalized events; database transaction timing excludes network and signature parsing; errors would fail the run.",
      poolErrors: 0,
      resultCounts: {
        ledgerEntries: Number(databaseState.ledger_entries),
        succeededAttempts: Number(databaseState.succeeded),
      },
    };

    expect(evidence.distinctFulfilment.p95Ms).toBeLessThan(500);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(
      outputPath,
      `${JSON.stringify(evidence, null, 2)}\n`,
      "utf8",
    );
    console.log(JSON.stringify(evidence));
  });
});
