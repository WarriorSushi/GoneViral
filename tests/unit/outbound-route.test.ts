import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/server/clicks/outbound-redirect", () => ({
  countEligibleOutboundClick: vi.fn(),
  resolveEligibleOutboundSlug: vi.fn(),
}));

import { GET } from "@/app/go/[slug]/route";
import {
  countEligibleOutboundClick,
  resolveEligibleOutboundSlug,
} from "@/server/clicks/outbound-redirect";

const listing = {
  categorySlug: "tech-apps",
  destinationUrl: "https://example.com/product",
  listingId: "b3f433e4-b8c3-42ff-86e7-47b92889a9a1",
  listingPublicId: "listing-public",
  slug: "safe-listing",
};

beforeEach(() => vi.clearAllMocks());

describe("safe outbound route", () => {
  it("uses only the stored slug destination and returns a temporary no-store redirect", async () => {
    vi.mocked(resolveEligibleOutboundSlug).mockResolvedValue(listing);
    vi.mocked(countEligibleOutboundClick).mockResolvedValue({
      businessDate: "2026-08-29",
      counted: true,
    });
    const request = new Request(
      "https://goneviral.in/go/safe-listing?url=https://evil.example",
    );
    const response = await GET(request, {
      params: Promise.resolve({ slug: "safe-listing" }),
    });
    expect(resolveEligibleOutboundSlug).toHaveBeenCalledWith("safe-listing");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(listing.destinationUrl);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("returns 404 without counting a hidden, missing, or unsafe listing", async () => {
    vi.mocked(resolveEligibleOutboundSlug).mockResolvedValue(null);
    const response = await GET(new Request("https://goneviral.in/go/hidden"), {
      params: Promise.resolve({ slug: "hidden" }),
    });
    expect(response.status).toBe(404);
    expect(countEligibleOutboundClick).not.toHaveBeenCalled();
  });

  it("redirects even when best-effort aggregation fails", async () => {
    vi.mocked(resolveEligibleOutboundSlug).mockResolvedValue(listing);
    vi.mocked(countEligibleOutboundClick).mockRejectedValue(
      new Error("database unavailable"),
    );
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await GET(
      new Request("https://goneviral.in/go/safe-listing"),
      { params: Promise.resolve({ slug: "safe-listing" }) },
    );
    expect(response.status).toBe(307);
  });
});
