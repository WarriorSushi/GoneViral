import "server-only";

import { revalidateTag } from "next/cache";

import { PUBLIC_CACHE_TAGS } from "./tags";

export type PublicCacheImpact = Readonly<{
  businessDate: string;
  categorySlugs: readonly string[];
  listingPublicId: string;
  listingSlug: string;
}>;

export function publicCacheTagsForImpact(
  impact: PublicCacheImpact,
): readonly string[] {
  return [
    PUBLIC_CACHE_TAGS.main,
    PUBLIC_CACHE_TAGS.activity,
    PUBLIC_CACHE_TAGS.today(impact.businessDate),
    PUBLIC_CACHE_TAGS.listing(impact.listingPublicId),
    PUBLIC_CACHE_TAGS.listingSlug(impact.listingSlug),
    ...new Set(impact.categorySlugs.map(PUBLIC_CACHE_TAGS.category)),
  ];
}

export function revalidatePublicCacheImpact(impact: PublicCacheImpact): void {
  for (const tag of publicCacheTagsForImpact(impact)) {
    revalidateTag(tag, { expire: 0 });
  }
}
