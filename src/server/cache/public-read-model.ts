import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import {
  getPublicListingDetail,
  listPublicActivity,
  listPublicSitemapEntries,
  listMainBoard,
  listPublicCategories,
  listTodayBoard,
  type MainBoardCursor,
  type TodayBoardCursor,
} from "@/server/db/repositories/leaderboards";

import { PUBLIC_CACHE_TAGS } from "./tags";

const PUBLIC_ACTIVITY_PREVIEW_SIZE = 4;

export async function getCachedPublicCategories() {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_CACHE_TAGS.main);
  return listPublicCategories();
}

export async function getCachedMainBoard(
  cursor: MainBoardCursor | null,
  categorySlug?: string,
) {
  "use cache: remote";
  cacheLife({ expire: 300, revalidate: 30, stale: 30 });
  cacheTag(
    categorySlug
      ? PUBLIC_CACHE_TAGS.category(categorySlug)
      : PUBLIC_CACHE_TAGS.main,
  );
  return categorySlug
    ? listMainBoard({ categorySlug, cursor })
    : listMainBoard({ cursor });
}

export async function getCachedTodayBoard(
  businessDate: string,
  cursor: TodayBoardCursor | null,
) {
  "use cache: remote";
  cacheLife({ expire: 300, revalidate: 30, stale: 30 });
  cacheTag(PUBLIC_CACHE_TAGS.today(businessDate));
  return listTodayBoard({ businessDate, cursor });
}

export async function getCachedPublicListingDetail(
  slug: string,
  businessDate: string,
) {
  "use cache: remote";
  cacheLife({ expire: 300, revalidate: 30, stale: 30 });
  cacheTag(PUBLIC_CACHE_TAGS.listingSlug(slug), PUBLIC_CACHE_TAGS.activity);
  const detail = await getPublicListingDetail({ businessDate, slug });

  if (detail) {
    cacheTag(PUBLIC_CACHE_TAGS.listing(detail.publicId));
  }

  return detail;
}

export async function getCachedPublicActivity() {
  "use cache: remote";
  cacheLife({ expire: 300, revalidate: 30, stale: 30 });
  cacheTag(PUBLIC_CACHE_TAGS.activity);
  return listPublicActivity(PUBLIC_ACTIVITY_PREVIEW_SIZE);
}

export async function getCachedPublicSitemapEntries() {
  "use cache: remote";
  cacheLife({ expire: 3600, revalidate: 300, stale: 300 });
  cacheTag(PUBLIC_CACHE_TAGS.main);
  return listPublicSitemapEntries();
}
