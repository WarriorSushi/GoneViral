import { createHmac } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { siteVisitorHmac } from "@/server/analytics/site-visits";

describe("site visit privacy digest", () => {
  it("is irreversible and scoped to one IST day", () => {
    const input = {
      businessDate: "2026-09-06",
      clientAddress: "203.0.113.42",
      secret: "secret",
      userAgent: "browser",
    };
    const digest = siteVisitorHmac(input);
    expect(digest).toBe(
      createHmac("sha256", input.secret)
        .update("goneviral:site-visit:v1\0")
        .update(input.businessDate)
        .update("\0")
        .update(input.clientAddress)
        .update("\0")
        .update(input.userAgent)
        .digest("hex"),
    );
    expect(digest).not.toContain(input.clientAddress);
    expect(siteVisitorHmac({ ...input, businessDate: "2026-09-07" })).not.toBe(
      digest,
    );
  });
});
