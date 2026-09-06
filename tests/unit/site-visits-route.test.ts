import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/analytics/site-visits", () => ({
  countSiteVisit: vi.fn(),
}));
vi.mock("@/server/telemetry/logger", () => ({
  logger: { error: vi.fn() },
}));

import { POST } from "@/app/api/site-visits/route";
import { countSiteVisit } from "@/server/analytics/site-visits";

function request(origin = "https://goneviral.in") {
  return new Request("https://goneviral.in/api/site-visits", {
    headers: { origin },
    method: "POST",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://goneviral.in");
});

describe("site visit route", () => {
  it("returns the public total through a same-origin no-store response", async () => {
    vi.mocked(countSiteVisit).mockResolvedValue({
      counted: true,
      totalVisits: "1234",
    });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual({ totalVisits: "1234" });
  });

  it("does not expose the counter route cross-origin", async () => {
    const response = await POST(request("https://example.com"));
    expect(response.status).toBe(404);
    expect(countSiteVisit).not.toHaveBeenCalled();
  });

  it("rejects malformed origins", async () => {
    const response = await POST(request("not-a-url"));
    expect(response.status).toBe(404);
    expect(countSiteVisit).not.toHaveBeenCalled();
  });

  it("rejects requests without a browser origin", async () => {
    const response = await POST(
      new Request("https://goneviral.in/api/site-visits", { method: "POST" }),
    );
    expect(response.status).toBe(404);
    expect(countSiteVisit).not.toHaveBeenCalled();
  });

  it("fails closed without affecting page rendering when counting fails", async () => {
    vi.mocked(countSiteVisit).mockRejectedValue(new Error("database offline"));
    const response = await POST(request());
    expect(response.status).toBe(503);
  });
});
