import "server-only";

export const PUBLIC_CACHE_TAGS = {
  main: "board:main",
  activity: "activity:public",
  today: (businessDate: string) => `board:today:${businessDate}`,
  category: (slug: string) => `board:category:${slug}`,
  listing: (publicId: string) => `listing:${publicId}`,
  listingSlug: (slug: string) => `listing-slug:${slug}`,
} as const;
