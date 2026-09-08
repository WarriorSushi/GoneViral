import { describe, expect, it } from "vitest";
import sharp from "sharp";

import robots, { buildRobotsFile } from "@/app/robots";
import {
  canonicalUrl,
  PRIVATE_ROBOT_PATHS,
  previewRobotsMetadata,
  PUBLIC_STATIC_SITEMAP_PATHS,
  publicPageMetadata,
  serializeJsonLd,
  SOCIAL_PREVIEW_IMAGE,
  WEBSITE_JSON_LD,
} from "@/config/seo";

describe("public SEO boundaries", () => {
  it("builds canonical public metadata without leaking private routes", () => {
    const metadata = publicPageMetadata({
      description: "A truthful description.",
      path: "/today",
      title: "Today's board",
    });

    expect(metadata.alternates).toEqual({
      canonical: "https://goneviral.in/today",
    });
    expect(metadata.openGraph).toMatchObject({
      images: [SOCIAL_PREVIEW_IMAGE],
      locale: "en_IN",
      type: "website",
      url: "https://goneviral.in/today",
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      images: [SOCIAL_PREVIEW_IMAGE],
    });
    expect(canonicalUrl("/category/local")).toBe(
      "https://goneviral.in/category/local",
    );
  });

  it("disallows every private or action surface and advertises only the public sitemap", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;

    expect(rules?.disallow).toEqual([...PRIVATE_ROBOT_PATHS]);
    expect(result.sitemap).toBe("https://goneviral.in/sitemap.xml");
    expect(PUBLIC_STATIC_SITEMAP_PATHS).not.toContain("/join");
    expect(PUBLIC_STATIC_SITEMAP_PATHS).not.toContain("/manage");
    expect(PUBLIC_STATIC_SITEMAP_PATHS).not.toContain("/admin");
    expect(PUBLIC_STATIC_SITEMAP_PATHS).toEqual(
      expect.arrayContaining([
        "/terms",
        "/about",
        "/privacy",
        "/refunds",
        "/content-policy",
        "/paid-placement",
        "/copyright",
        "/contact",
      ]),
    );
  });

  it("blocks indexing and sitemap discovery on Vercel previews", () => {
    const previewRobots = buildRobotsFile("preview");
    const rules = Array.isArray(previewRobots.rules)
      ? previewRobots.rules[0]
      : previewRobots.rules;

    expect(rules).toMatchObject({ disallow: "/", userAgent: "*" });
    expect(previewRobots).not.toHaveProperty("sitemap");
    expect(previewRobotsMetadata("preview")).toEqual({
      follow: false,
      index: false,
      nocache: true,
    });
    expect(previewRobotsMetadata("production")).toBeUndefined();
  });

  it("publishes a stable site identity and safely serializes JSON-LD", () => {
    expect(WEBSITE_JSON_LD).toMatchObject({
      name: "GoneViral.in",
      url: "https://goneviral.in/",
    });
    expect(serializeJsonLd({ value: "<script>" })).toBe(
      '{"value":"\\u003cscript>"}',
    );
  });

  it("ships the requested large social preview image", async () => {
    await expect(
      sharp("public/goneviral-social-preview.png").metadata(),
    ).resolves.toMatchObject({ format: "png", height: 630, width: 1200 });
  });
});
