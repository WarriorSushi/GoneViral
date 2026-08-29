import type { MetadataRoute } from "next";

import { canonicalUrl, PRIVATE_ROBOT_PATHS, SITE_ORIGIN } from "@/config/seo";

export function buildRobotsFile(
  vercelEnvironment: string | undefined,
): MetadataRoute.Robots {
  if (vercelEnvironment === "preview") {
    return {
      rules: {
        disallow: "/",
        userAgent: "*",
      },
    };
  }

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

export default function robots(): MetadataRoute.Robots {
  return buildRobotsFile(process.env.VERCEL_ENV);
}
