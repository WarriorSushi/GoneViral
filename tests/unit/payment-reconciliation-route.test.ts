import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/config/env/server", () => ({
  readServerEnv: () => ({ CRON_SECRET: "phase9-cron-secret" }),
}));
vi.mock("@/server/payments/reconciliation", () => ({
  runPaymentReconciliation: vi.fn(),
}));

import { GET } from "@/app/api/cron/reconcile-payments/route";
import { runPaymentReconciliation } from "@/server/payments/reconciliation";

beforeEach(() => vi.clearAllMocks());

describe("payment reconciliation cron boundary", () => {
  it("requires the exact server-only cron bearer secret", async () => {
    const response = await GET(
      new Request("https://goneviral.test/api/cron/reconcile-payments"),
    );
    expect(response.status).toBe(401);
    expect(runPaymentReconciliation).not.toHaveBeenCalled();
  });

  it("returns a private summary for an authorized run", async () => {
    vi.mocked(runPaymentReconciliation).mockResolvedValue({
      applied: 2,
      discrepancies: 0,
      duplicates: 1,
      failed: 0,
      quarantined: 0,
      runId: "phase9-run",
    });
    const response = await GET(
      new Request("https://goneviral.test/api/cron/reconcile-payments", {
        headers: { Authorization: "Bearer phase9-cron-secret" },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toMatchObject({
      applied: 2,
      runId: "phase9-run",
    });
  });

  it("asks the scheduler to retry a failed provider run", async () => {
    vi.mocked(runPaymentReconciliation).mockRejectedValue(
      new Error("provider unavailable"),
    );
    const response = await GET(
      new Request("https://goneviral.test/api/cron/reconcile-payments", {
        headers: { Authorization: "Bearer phase9-cron-secret" },
      }),
    );
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "retry" });
  });
});
