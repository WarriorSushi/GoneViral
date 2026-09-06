import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { ActivityFeed } from "@/components/public/activity-feed";
import { Leaderboard } from "@/components/public/leaderboard";
import type { PublicMainBoardEntry } from "@/server/db/repositories/public-types";
import type {
  PublicListingDetail,
  PublicTodayBoardEntry,
} from "@/server/db/repositories/public-types";

const mocks = vi.hoisted(() => ({
  estimateNewListingRank: vi.fn(),
  getCachedMainBoard: vi.fn(),
  getCachedPublicActivity: vi.fn(),
  getCachedPublicCategories: vi.fn(),
  getCachedPublicListingDetail: vi.fn(),
  listActiveCategories: vi.fn(),
}));

vi.mock("@/server/cache/public-read-model", () => ({
  getCachedMainBoard: mocks.getCachedMainBoard,
  getCachedPublicActivity: mocks.getCachedPublicActivity,
  getCachedPublicCategories: mocks.getCachedPublicCategories,
  getCachedPublicListingDetail: mocks.getCachedPublicListingDetail,
}));

vi.mock("@/server/db/repositories/categories", () => ({
  listActiveCategories: mocks.listActiveCategories,
}));

vi.mock("@/config/env/public", () => ({
  readPublicEnv: () => ({ NEXT_PUBLIC_TURNSTILE_SITE_KEY: undefined }),
}));

vi.mock("@/config/env/server", () => ({
  readServerEnv: () => ({ TURNSTILE_MODE: "mock" }),
}));

vi.mock("next/server", () => ({ connection: vi.fn() }));

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
    businessDate: null,
    estimatedAt: "2026-09-04T10:00:00.000Z",
    policyVersion: "2026-01-01",
    rankingScope: "all_time",
    requiredPaymentPaise: "50100",
    targetRank: "1",
    targetTotalPaise: "50000",
  },
  uniqueClicks: "0",
};

const detail: PublicListingDetail = {
  ...entry,
  currentMainRank: "87",
  featuredSince: "2026-09-01T10:00:00.000Z",
  movements: [],
  todayNetPaise: "60000",
  todayRank: "1",
};

const todayEntry: PublicTodayBoardEntry = {
  ...entry,
  confirmedTotalPaise: "5000000",
  rank: "1",
  takeoverQuote: {
    businessDate: "2026-09-06",
    estimatedAt: "2026-09-06T10:00:00.000Z",
    policyVersion: "2026-08-29-v2",
    rankingScope: "daily",
    requiredPaymentPaise: "60100",
    targetRank: "1",
    targetTotalPaise: "60000",
  },
  todayNetPaise: "60000",
  todayTotalReachedAt: "2026-09-06T10:00:00.000Z",
  uniqueClicks: "42",
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
    mocks.getCachedPublicListingDetail.mockResolvedValue(detail);
    mocks.listActiveCategories.mockResolvedValue([entry.category]);
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

  it("renders Daily money, clicks, scope, and quote from the Daily entry", () => {
    const html = renderToStaticMarkup(
      createElement(Leaderboard, {
        entries: [todayEntry],
        nextCursor: null,
        pageHref: "/today",
        today: true,
      }),
    );

    expect(html).toContain("₹600");
    expect(html).toContain("today");
    expect(html).toContain("₹50,000");
    expect(html).toContain("42 total clicks");
    expect(html).toContain("Take Daily #1");
    expect(html).toContain("target=example&amp;scope=daily");
    expect(html).toContain("₹601");
  });

  it("resolves a public target beyond #50 and prices its Daily score", async () => {
    const { JoinPageContent } =
      await import("@/components/join/join-page-content");
    const page = await JoinPageContent({
      searchParams: Promise.resolve({ scope: "daily", target: "example" }),
    });
    const html = renderToStaticMarkup(page);

    expect(mocks.getCachedPublicListingDetail).toHaveBeenCalledWith(
      "example",
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    );
    expect(html).toContain('name="targetSlug" value="example"');
    expect(html).toContain('name="targetScope" value="daily"');
    expect(html).toContain('name="amount"');
    expect(html).toContain('min="601"');
  });

  it("falls back safely when a target is not public-eligible", async () => {
    mocks.getCachedPublicListingDetail.mockResolvedValueOnce(null);
    const { JoinPageContent } =
      await import("@/components/join/join-page-content");
    const page = await JoinPageContent({
      searchParams: Promise.resolve({ target: "hidden-listing" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('name="targetSlug" value=""');
    expect(html).toContain('name="targetScope" value="all_time"');
    expect(html).toContain('min="499"');
  });
});
