import { describe, expect, it } from "vitest";

import {
  buildContentSecurityPolicy,
  securityHeaders,
} from "@/config/security-headers";

describe("application security headers", () => {
  it("enforces a production CSP compatible with Supabase, Turnstile, and Sentry", () => {
    const policy = buildContentSecurityPolicy({
      nodeEnvironment: "production",
      sentryDsn: "https://public@example.ingest.sentry.io/1",
      siteUrl: "https://goneviral.in",
      supabaseUrl: "https://project.supabase.co",
    });
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("https://challenges.cloudflare.com");
    expect(policy).toContain("https://project.supabase.co");
    expect(policy).toContain("https://example.ingest.sentry.io");
    expect(policy).toContain("upgrade-insecure-requests");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).not.toMatch(/(?:^|\s)\*(?:\s|;|$)/);
  });

  it("does not force an impossible TLS upgrade on explicit loopback labs", () => {
    const policy = buildContentSecurityPolicy({
      nodeEnvironment: "production",
      sentryDsn: undefined,
      siteUrl: "http://127.0.0.1:3100",
      supabaseUrl: "http://127.0.0.1:54321",
    });
    expect(policy).not.toContain("upgrade-insecure-requests");
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it("sets the complete no-sniff, framing, referrer, feature, and transport set", () => {
    const headers = new Map(
      securityHeaders().map((header) => [header.key, header.value]),
    );
    expect(headers.get("Strict-Transport-Security")).toContain("max-age=");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
    expect(headers.get("Cross-Origin-Opener-Policy")).toBe(
      "same-origin-allow-popups",
    );
  });
});
