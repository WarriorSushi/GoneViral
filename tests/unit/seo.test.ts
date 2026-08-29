import { describe, expect, it } from "vitest";

import robots from "@/app/robots";
import {
  canonicalUrl,
  PRIVATE_ROBOT_PATHS,
  PUBLIC_STATIC_SITEMAP_PATHS,
  publicPageMetadata,
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
      locale: "en_IN",
      type: "website",
      url: "https://goneviral.in/today",
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
  });
});
