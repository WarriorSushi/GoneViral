import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  EMAIL_TEMPLATE_VERSION,
  renderEmailTemplate,
} from "@/server/email/templates";

describe("versioned transactional email templates", () => {
  it("escapes sponsor content in HTML and emits only a safe support reference", () => {
    const rendered = renderEmailTemplate({
      kind: "moderation_result",
      payload: {
        listingName: '<img src=x onerror="alert(1)">',
        listingPublicId: "listing_safe_123",
        outcome: "suspended",
        publicReason: "<script>steal()</script>",
      },
      siteUrl: "https://goneviral.in",
      templateVersion: EMAIL_TEMPLATE_VERSION,
    });
    expect(rendered.html).toContain("&lt;img");
    expect(rendered.html).toContain("&lt;script&gt;");
    expect(rendered.html).not.toContain("<script>");
    expect(rendered.html).not.toContain("<img src=x");
    expect(rendered.html).toContain("goneviral-email-logo.webp");
    expect(rendered.html).toContain("Gone<span");
    expect(rendered.html).toContain("listing_safe_123</span>");
  });

  it("keeps management-link creation with Supabase Auth and never embeds a token", () => {
    const rendered = renderEmailTemplate({
      kind: "management_link_requested",
      payload: {
        listingName: "Safe Studio",
        listingPublicId: "listing_safe_123",
      },
      siteUrl: "https://goneviral.in",
      templateVersion: EMAIL_TEMPLATE_VERSION,
    });
    expect(rendered.html).toContain("https://goneviral.in/manage");
    expect(rendered.text).toContain("one-time sign-in link");
    expect(`${rendered.html}${rendered.text}`).not.toMatch(
      /token=|otp=|provider_payment|webhook|secret/i,
    );
  });

  it("rejects unknown versions instead of silently changing sent copy", () => {
    expect(() =>
      renderEmailTemplate({
        kind: "verification_delay",
        payload: {
          attemptPublicId: "att_abcdefghijklmnopqrstuvwx",
          listingName: "Safe Studio",
          listingPublicId: "listing_safe_123",
        },
        siteUrl: "https://goneviral.in",
        templateVersion: "future-version",
      }),
    ).toThrow("email_template_version_unsupported");
  });
});
