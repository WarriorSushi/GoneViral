import type { Metadata } from "next";

export const SITE_ORIGIN = "https://goneviral.in";
export const SPECIFICATION_DATE = "2026-09-08";
export const SOCIAL_PREVIEW_IMAGE = {
  alt: "GoneViral.in — India’s Sponsored Leaderboard",
  height: 630,
  url: `${SITE_ORIGIN}/goneviral-social-preview.png`,
  width: 1200,
} as const;

export const PRIVATE_ROBOT_PATHS = [
  "/admin",
  "/actions",
  "/api",
  "/auth",
  "/go/",
  "/join",
  "/manage",
  "/l/*/report",
] as const;

export const PUBLIC_STATIC_SITEMAP_PATHS = [
  "/",
  "/today",
  "/about",
  "/how-it-works",
  "/terms",
  "/privacy",
  "/refunds",
  "/content-policy",
  "/paid-placement",
  "/copyright",
  "/contact",
] as const;

export function canonicalUrl(path: string): string {
  return new URL(path, SITE_ORIGIN).toString();
}

export function previewRobotsMetadata(
  vercelEnvironment: string | undefined,
): Metadata["robots"] {
  if (vercelEnvironment !== "preview") return undefined;

  return { follow: false, index: false, nocache: true };
}

export const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  alternateName: ["GoneViral", "goneviral.in"],
  name: "GoneViral.in",
  url: `${SITE_ORIGIN}/`,
} as const;

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function publicPageMetadata(input: {
  description: string;
  path: string;
  title: string;
}): Metadata {
  const url = canonicalUrl(input.path);
  return {
    alternates: { canonical: url },
    description: input.description,
    openGraph: {
      description: input.description,
      locale: "en_IN",
      images: [SOCIAL_PREVIEW_IMAGE],
      siteName: "GoneViral.in",
      title: input.title,
      type: "website",
      url,
    },
    title: input.title,
    twitter: {
      card: "summary_large_image",
      description: input.description,
      images: [SOCIAL_PREVIEW_IMAGE],
      title: input.title,
    },
  };
}
