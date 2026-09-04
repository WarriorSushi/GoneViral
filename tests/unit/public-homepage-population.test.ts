import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActivityFeed } from "@/components/public/activity-feed";
import { Leaderboard } from "@/components/public/leaderboard";
import type { PublicMainBoardEntry } from "@/server/db/repositories/public-types";

const mocks = vi.hoisted(() => ({
  estimateNewListingRank: vi.fn(),
  getCachedMainBoard: vi.fn(),
  getCachedPublicActivity: vi.fn(),
  getCachedPublicCategories: vi.fn(),
}));

vi.mock("@/server/cache/public-read-model", () => ({
  getCachedMainBoard: mocks.getCachedMainBoard,
  getCachedPublicActivity: mocks.getCachedPublicActivity,
  getCachedPublicCategories: mocks.getCachedPublicCategories,
}));

vi.mock("@/server/db/repositories/leaderboards", () => ({
  estimateNewListingRank: mocks.estimateNewListingRank,
  parseMainBoardCursor: () => ({ ok: true, value: null }),
}));

const entry: PublicMainBoardEntry = {
  category: { name: "Technology", slug: "technology", sortOrder: 1 },
  confirmedTotalPaise: "50000",
  currentTotalReachedAt: "2026-09-04T10:00:00.000Z",
  destinationUrl: "https://example.com",
  logoUrl: null,
  name: "Example",
  publicId: "11111111-1111-4111-8111-111111111111",
  rank: "1",
  slug: "example",
  tagline: "Example listing",
  takeoverQuote: {
    estimatedAt: "2026-09-04T10:00:00.000Z",
    policyVersion: "2026-01-01",
    requiredPaymentPaise: "50100",
    targetRank: "1",
    targetTotalPaise: "50000",
  },
  uniqueClicks: "0",
};

describe("public homepage population states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCachedMainBoard.mockResolvedValue({
      businessDate: null,
      entries: [entry],
      generatedAt: "2026-09-04T10:00:00.000Z",
      nextCursor: null,
    });
    mocks.getCachedPublicActivity.mockResolvedValue([]);
    mocks.getCachedPublicCategories.mockResolvedValue([entry.category]);
  });

  it("uses the authoritative minimum-payment projection for the acquisition row", async () => {
    mocks.estimateNewListingRank.mockResolvedValue({
      estimatedAt: "2026-09-04T10:00:00.000Z",
      estimatedRank: "2",
      estimatedTotalPaise: "49900",
      policyVersion: "2026-01-01",
    });
    const { default: Home } = await import("@/app/page");
    const page = await Home({ searchParams: Promise.resolve({}) } as never);
    const html = renderToStaticMarkup(page);

    expect(mocks.estimateNewListingRank).toHaveBeenCalledWith({
      amountPaise: 49_900n,
    });
    expect(html).toContain("#2 could be yours");
  });

  it("uses non-ranking fallback copy when the projection is unavailable", async () => {
    mocks.estimateNewListingRank.mockRejectedValue(new Error("unavailable"));
    const { default: Home } = await import("@/app/page");
    const page = await Home({ searchParams: Promise.resolve({}) } as never);
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Your spot could be next");
    expect(html).not.toContain("#2 could be yours");
  });

  it("renders no Recent Moves section when there are no public movements", () => {
    const html = renderToStaticMarkup(
      createElement(ActivityFeed, { items: [] }),
    );

    expect(html).toBe("");
  });

  it("shows an end state instead of the zero-board state on an empty later page", () => {
    const html = renderToStaticMarkup(
      createElement(Leaderboard, {
        entries: [],
        fillOpenPositions: true,
        isPaginated: true,
        nextCursor: null,
        pageHref: "/",
      }),
    );

    expect(html).toContain("No more positions.");
    expect(html).not.toContain("No one is here. Yet.");
  });
});
