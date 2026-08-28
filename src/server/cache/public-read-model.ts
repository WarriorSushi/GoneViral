import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import {
  getPublicListingDetail,
  listMainBoard,
  listPublicCategories,
  listTodayBoard,
  type MainBoardCursor,
  type TodayBoardCursor,
} from "@/server/db/repositories/leaderboards";

import { PUBLIC_CACHE_TAGS } from "./tags";

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
  "use cache";
  cacheLife("seconds");
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
  "use cache";
  cacheLife("seconds");
  cacheTag(PUBLIC_CACHE_TAGS.today(businessDate));
  return listTodayBoard({ businessDate, cursor });
}

export async function getCachedPublicListingDetail(
  slug: string,
  businessDate: string,
) {
  "use cache";
  cacheLife("seconds");
  cacheTag(PUBLIC_CACHE_TAGS.listingSlug(slug), PUBLIC_CACHE_TAGS.activity);
  const detail = await getPublicListingDetail({ businessDate, slug });

  if (detail) {
    cacheTag(PUBLIC_CACHE_TAGS.listing(detail.publicId));
  }

  return detail;
}
