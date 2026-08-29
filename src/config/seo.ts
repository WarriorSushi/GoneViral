import type { Metadata } from "next";

export const SITE_ORIGIN = "https://goneviral.in";
export const SPECIFICATION_DATE = "2026-08-29";

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
  "/how-it-works",
] as const;

export function canonicalUrl(path: string): string {
  return new URL(path, SITE_ORIGIN).toString();
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
      siteName: "GoneViral.in",
      title: input.title,
      type: "website",
      url,
    },
    title: input.title,
    twitter: {
      card: "summary_large_image",
      description: input.description,
      title: input.title,
    },
  };
}

export const draftLegalRobots: Metadata["robots"] = {
  follow: false,
  index: false,
};
