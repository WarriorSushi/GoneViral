import type { MetadataRoute } from "next";

import { canonicalUrl, PRIVATE_ROBOT_PATHS, SITE_ORIGIN } from "@/config/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    host: SITE_ORIGIN,
    rules: {
      allow: "/",
      disallow: [...PRIVATE_ROBOT_PATHS],
      userAgent: "*",
    },
    sitemap: canonicalUrl("/sitemap.xml"),
  };
}
