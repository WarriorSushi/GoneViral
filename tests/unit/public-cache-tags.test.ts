import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

import { revalidateTag } from "next/cache";

import {
  publicCacheTagsForImpact,
  revalidatePublicCacheImpact,
} from "@/server/cache/invalidate-public";
import { publicRefreshTags } from "@/server/cache/public-refresh";

const impact = {
  businessDate: "2026-08-29",
  categorySlugs: ["local", "technology", "local"],
  listingPublicId: "01PHASE14PUBLICID",
  listingSlug: "phase-14-listing",
} as const;

describe("exact public cache invalidation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the complete, deduplicated affected tag set", () => {
    expect(publicCacheTagsForImpact(impact)).toEqual([
      "board:main",
      "activity:public",
      "board:today:2026-08-29",
      "listing:01PHASE14PUBLICID",
      "listing-slug:phase-14-listing",
      "board:category:local",
      "board:category:technology",
    ]);
  });

  it("expires every affected tag immediately", () => {
    revalidatePublicCacheImpact(impact);

    expect(revalidateTag).toHaveBeenCalledTimes(7);
    expect(revalidateTag).toHaveBeenCalledWith("board:main", { expire: 0 });
    expect(revalidateTag).toHaveBeenCalledWith("board:category:local", {
      expire: 0,
    });
  });
});

describe("manual public refresh", () => {
  it("refreshes both visible homepage data sets", () => {
    const form = new FormData();
    form.set("kind", "main");

    expect(publicRefreshTags(form)).toEqual(["board:main", "activity:public"]);
  });
});
