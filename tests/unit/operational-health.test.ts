import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { captureOperationalAlert, collectOperationalMetrics, logger } =
  vi.hoisted(() => ({
    captureOperationalAlert: vi.fn(),
    collectOperationalMetrics: vi.fn(),
    logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  }));

vi.mock("@/server/operations/metrics", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/server/operations/metrics")>();
  return { ...original, collectOperationalMetrics };
});
vi.mock("@/server/telemetry/alerts", () => ({ captureOperationalAlert }));
vi.mock("@/server/telemetry/logger", () => ({ logger }));

import { GET } from "@/app/api/cron/check-operational-health/route";
import {
  evaluateOperationalHealth,
  type OperationalMetrics,
} from "@/server/operations/metrics";

const healthy: OperationalMetrics = {
  abuse: [],
  emailBacklog: "0",
  emailDeadLetters: "0",
  lastProviderEventAt: null,
  ledgerProjectionMismatches: "0",
  openReconciliationItems: "0",
  providerQuarantines: "0",
  stalePendingAttempts: "0",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", "phase13-cron-secret");
});

describe("operational metrics and alert route", () => {
  it("assigns critical severity to financial mismatch/quarantine signals", () => {
    expect(
      evaluateOperationalHealth({
        ...healthy,
        emailDeadLetters: "2",
        ledgerProjectionMismatches: "1",
        providerQuarantines: "3",
      }),
    ).toEqual([
      {
        code: "ledger_projection_mismatch",
        severity: "critical",
        value: "1",
      },
      {
        code: "provider_event_quarantine",
        severity: "critical",
        value: "3",
      },
      { code: "email_dead_letter", severity: "warning", value: "2" },
    ]);
  });

  it("authenticates the cron, emits each safe alert, and returns count-only data", async () => {
    collectOperationalMetrics.mockResolvedValueOnce({
      ...healthy,
      stalePendingAttempts: "1",
    });
    const response = await GET(
      new Request("https://goneviral.in/api/cron/check-operational-health", {
        headers: {
          authorization: "Bearer phase13-cron-secret",
          "x-request-id": "phase13-health-request",
        },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("phase13-health-request");
    const body = await response.json();
    expect(body.status).toBe("attention");
    expect(captureOperationalAlert).toHaveBeenCalledWith(
      {
        code: "payment_attempt_stale",
        severity: "warning",
        value: "1",
      },
      "phase13-health-request",
    );
    expect(JSON.stringify(body)).not.toMatch(/@|phone|provider_payment/i);
  });

  it("rejects missing auth and turns database failure into a retryable 503", async () => {
    const unauthorized = await GET(
      new Request("https://goneviral.in/api/cron/check-operational-health"),
    );
    expect(unauthorized.status).toBe(401);
    collectOperationalMetrics.mockRejectedValueOnce(
      new Error("database secret details"),
    );
    const failed = await GET(
      new Request("https://goneviral.in/api/cron/check-operational-health", {
        headers: { authorization: "Bearer phase13-cron-secret" },
      }),
    );
    expect(failed.status).toBe(503);
    await expect(failed.json()).resolves.toEqual({ status: "retry" });
    expect(logger.error).toHaveBeenCalledWith(
      "operational_health_failed",
      expect.objectContaining({ errorName: "Error" }),
    );
  });
});
