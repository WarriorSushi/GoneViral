import type { MetadataRoute } from "next";
import { connection } from "next/server";

import {
  canonicalUrl,
  PUBLIC_STATIC_SITEMAP_PATHS,
  SPECIFICATION_DATE,
} from "@/config/seo";
import {
  getCachedPublicCategories,
  getCachedPublicSitemapEntries,
} from "@/server/cache/public-read-model";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Keep builds environment-independent; the allowlisted public projection is
  // fetched at request time and then held by the shared cache functions below.
  await connection();
  const [categories, listings] = await Promise.all([
    getCachedPublicCategories(),
    getCachedPublicSitemapEntries(),
  ]);
  const specificationDate = new Date(`${SPECIFICATION_DATE}T00:00:00+05:30`);
  const staticEntries: MetadataRoute.Sitemap = PUBLIC_STATIC_SITEMAP_PATHS.map(
    (path) => ({
      changeFrequency: path === "/how-it-works" ? "monthly" : "daily",
      lastModified: specificationDate,
      priority: path === "/" ? 1 : 0.7,
      url: canonicalUrl(path),
    }),
  );

  return [
    ...staticEntries,
    ...categories.map((category) => ({
      changeFrequency: "daily" as const,
      lastModified: specificationDate,
      priority: 0.7,
      url: canonicalUrl(`/category/${category.slug}`),
    })),
    ...listings.map((listing) => ({
      changeFrequency: "daily" as const,
      lastModified: new Date(listing.updatedAt),
      priority: 0.6,
      url: canonicalUrl(`/l/${listing.slug}`),
    })),
  ];
}
