import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { closeDatabase } from "@/server/db/client";
import {
  collectOperationalMetrics,
  evaluateOperationalHealth,
} from "@/server/operations/metrics";

const runtimeDatabaseUrl =
  "postgresql://postgres.pooler-dev:postgres@127.0.0.1:54329/postgres";
const directDatabaseUrl =
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

beforeAll(() => {
  process.env.DATABASE_URL = runtimeDatabaseUrl;
  process.env.DATABASE_DIRECT_URL = directDatabaseUrl;
});

afterAll(async () => {
  await closeDatabase();
});

describe("Phase 13 operational metric query", () => {
  it("returns aggregate strings without PII and evaluates the current database", async () => {
    const metrics = await collectOperationalMetrics();
    expect(metrics.ledgerProjectionMismatches).toMatch(/^\d+$/);
    expect(metrics.providerQuarantines).toMatch(/^\d+$/);
    expect(metrics.emailBacklog).toMatch(/^\d+$/);
    for (const item of metrics.abuse) {
      expect(item.activeBuckets).toMatch(/^\d+$/);
      expect(item.observedCount).toMatch(/^\d+$/);
      expect(item.scope).not.toBe("");
    }
    expect(JSON.stringify(metrics)).not.toMatch(
      /@example|canonical_email|recipient_encrypted|subject_hmac/i,
    );
    expect(() => evaluateOperationalHealth(metrics)).not.toThrow();
  });
});
