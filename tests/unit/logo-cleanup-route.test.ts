import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/config/env/server", () => ({
  readServerEnv: () => ({ CRON_SECRET: "phase8-cron-secret" }),
}));
vi.mock("@/server/storage/logo-service", () => ({
  cleanupExpiredLogoAssets: vi.fn(),
}));
vi.mock("@/server/storage/logo-storage", () => ({
  SupabaseLogoStorage: class {},
}));

import { GET } from "@/app/api/cron/cleanup-logo-assets/route";
import { cleanupExpiredLogoAssets } from "@/server/storage/logo-service";

beforeEach(() => vi.clearAllMocks());

describe("logo cleanup cron boundary", () => {
  it("requires the exact server-only cron bearer secret", async () => {
    const response = await GET(
      new Request("https://goneviral.test/api/cron/cleanup-logo-assets"),
    );
    expect(response.status).toBe(401);
    expect(cleanupExpiredLogoAssets).not.toHaveBeenCalled();
  });

  it("runs bounded cleanup without exposing cached output", async () => {
    vi.mocked(cleanupExpiredLogoAssets).mockResolvedValue(7);
    const response = await GET(
      new Request("https://goneviral.test/api/cron/cleanup-logo-assets", {
        headers: { Authorization: "Bearer phase8-cron-secret" },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual({ cleaned: 7 });
  });
});
