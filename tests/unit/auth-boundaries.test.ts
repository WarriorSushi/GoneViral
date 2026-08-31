import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { canonicalizeOwnerEmail } from "@/server/auth/claim-owner";
import {
  buildManageCallbackUrl,
  safeManageRedirect,
} from "@/server/auth/redirect";
import { config as proxyConfig } from "@/proxy";

describe("owner auth boundaries", () => {
  it("canonicalizes the verified Auth email without consulting metadata", () => {
    expect(canonicalizeOwnerEmail("  OWNER@Example.COM  ")).toBe(
      "owner@example.com",
    );
  });

  it("refreshes auth only where owner sessions are consumed", () => {
    expect(proxyConfig.matcher).toEqual([
      "/manage/:path*",
      "/admin/:path*",
      "/auth/:path*",
    ]);
  });

  it("requests the exact hosted callback without a query-string mismatch", () => {
    expect(
      buildManageCallbackUrl(
        "https://goneviral-phase15-preview-warriorsushis-projects.vercel.app",
      ),
    ).toBe(
      "https://goneviral-phase15-preview-warriorsushis-projects.vercel.app/auth/callback",
    );
  });

  it.each([
    [null, "/manage"],
    ["/manage", "/manage"],
    ["/manage/example-listing", "/manage/example-listing"],
    ["https://evil.example/manage", "/manage"],
    ["//evil.example/manage", "/manage"],
    ["/manage\\@evil.example", "/manage"],
    ["/join", "/manage"],
    ["/manage/example?leak=1", "/manage"],
  ])("normalizes callback target %s to %s", (candidate, expected) => {
    expect(safeManageRedirect(candidate)).toBe(expected);
  });
});
