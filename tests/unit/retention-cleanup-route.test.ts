import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/config/env/server", () => ({
  readServerEnv: () => ({ CRON_SECRET: "phase11-cron-secret" }),
}));
vi.mock("@/server/analytics/site-visits", () => ({
  deleteExpiredSiteVisitDedupe: vi.fn(),
}));
vi.mock("@/server/clicks/outbound-redirect", () => ({
  deleteExpiredClickDedupe: vi.fn(),
}));

import { GET } from "@/app/api/cron/cleanup-retention/route";
import { deleteExpiredSiteVisitDedupe } from "@/server/analytics/site-visits";
import { deleteExpiredClickDedupe } from "@/server/clicks/outbound-redirect";

beforeEach(() => vi.clearAllMocks());

describe("click retention cleanup boundary", () => {
  it("rejects an absent bearer secret", async () => {
    const response = await GET(
      new Request("https://goneviral.in/api/cron/cleanup-retention"),
    );
    expect(response.status).toBe(401);
    expect(deleteExpiredClickDedupe).not.toHaveBeenCalled();
    expect(deleteExpiredSiteVisitDedupe).not.toHaveBeenCalled();
  });

  it("deletes expired dedupe rows through an authenticated no-store cron", async () => {
    vi.mocked(deleteExpiredClickDedupe).mockResolvedValue(4);
    vi.mocked(deleteExpiredSiteVisitDedupe).mockResolvedValue(2);
    const response = await GET(
      new Request("https://goneviral.in/api/cron/cleanup-retention", {
        headers: { authorization: "Bearer phase11-cron-secret" },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual({
      deletedClickDedupe: 4,
      deletedSiteVisitDedupe: 2,
    });
  });
});
