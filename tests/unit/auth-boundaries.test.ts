import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { canonicalizeOwnerEmail } from "@/server/auth/claim-owner";
import { safeManageRedirect } from "@/server/auth/redirect";
import { config as proxyConfig } from "@/proxy";

describe("owner auth boundaries", () => {
  it("canonicalizes the verified Auth email without consulting metadata", () => {
    expect(canonicalizeOwnerEmail("  OWNER@Example.COM  ")).toBe(
      "owner@example.com",
    );
  });

  it("refreshes auth only where owner sessions are consumed", () => {
    expect(proxyConfig.matcher).toEqual(["/manage/:path*", "/auth/:path*"]);
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
