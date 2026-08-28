import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { canonicalizeDestination } from "@/domain/destination";
import type { JoinInput } from "@/domain/join";
import { moneyPaise } from "@/domain/money";
import { POLICY_VERSION } from "@/domain/policy";
import { closeDatabase } from "@/server/db/client";
import { createGuestCheckout } from "@/server/payments/create-guest-checkout";
import { MockDodoProvider } from "@/server/payments/mock-provider";
import type { CheckoutRequest } from "@/server/payments/provider";
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

function joinInput(
  destinationUrl: string,
  idempotencyKey = randomUUID(),
): JoinInput {
  const destination = canonicalizeDestination(destinationUrl);
  if (!destination.ok) throw new Error("Test destination must be safe.");
  return {
    amountPaise: moneyPaise(49_900n),
    applicationIdempotencyKey: idempotencyKey,
    categorySlug: "tech-apps",
    destination: destination.value,
    email: `phase4-${idempotencyKey}@example.com`,
    name: "Phase Four Integration",
    phone: "+919876543210",
    policyVersion: POLICY_VERSION,
    tagline: "A deterministic guest checkout integration test",
    targetSlug: null,
    turnstileToken: `local-pass-${randomUUID()}`,
  };
}

beforeAll(() => {
  process.env.DATABASE_URL = runtimeDatabaseUrl;
  process.env.DATABASE_DIRECT_URL = directDatabaseUrl;
  process.env.SUBMISSION_HMAC_SECRET = "phase4-integration-local-only-secret";
  clearFixtures();
});

afterAll(async () => {
  await closeDatabase();
  clearFixtures();
});

describe("Phase 4 guest checkout transaction and idempotency", () => {
  it("replays one checkout and prevents a duplicate destination", async () => {
    const provider = new MockDodoProvider("http://localhost:3000");
    const form = joinInput(`https://phase4-${randomUUID()}.example.com/path`);
    const dependencies = {
      form,
      provider,
      remoteIp: `integration-${randomUUID()}`,
      siteUrl: "http://localhost:3000",
      turnstile: new MockTurnstileVerifier(),
    };
    const first = await createGuestCheckout(dependencies);
    const replay = await createGuestCheckout(dependencies);
    expect(first).toMatchObject({ kind: "checkout" });
    expect(replay).toEqual(first);

    const duplicate = await createGuestCheckout({
      ...dependencies,
      form: joinInput(form.destination.url),
    });
    expect(duplicate).toEqual({ kind: "duplicate" });
  });

  it("allows only one provider create during concurrent identical requests", async () => {
    const delegate = new MockDodoProvider("http://localhost:3000");
    let creates = 0;
    const provider = {
      ...delegate,
      createCheckout: async (request: CheckoutRequest) => {
        creates += 1;
        return delegate.createCheckout(request);
      },
      recoverCheckout: delegate.recoverCheckout.bind(delegate),
      retrieveCheckout: delegate.retrieveCheckout.bind(delegate),
    };
    const idempotencyKey = randomUUID();
    const destination = `https://concurrent-${randomUUID()}.example.com`;
    const base = {
      provider,
      remoteIp: `integration-${randomUUID()}`,
      siteUrl: "http://localhost:3000",
      turnstile: new MockTurnstileVerifier(),
    };
    const results = await Promise.all([
      createGuestCheckout({
        ...base,
        form: joinInput(destination, idempotencyKey),
      }),
      createGuestCheckout({
        ...base,
        form: joinInput(destination, idempotencyKey),
      }),
    ]);
    expect(creates).toBe(1);
    expect(results.some((result) => result.kind === "checkout")).toBe(true);
    expect(results.every((result) => result.kind !== "rejected")).toBe(true);
  });
});
