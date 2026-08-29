import { createHmac } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  clientAddress,
  outboundVisitorHmac,
  shouldCountOutboundRequest,
} from "@/server/clicks/outbound-redirect";

function clickRequest(headers: Record<string, string> = {}) {
  return new Request("https://goneviral.in/go/listing", {
    headers: {
      "user-agent": "Mozilla/5.0 browser",
      "x-forwarded-for": "203.0.113.42, 10.0.0.1",
      ...headers,
    },
  });
}

describe("privacy-safe outbound request classification", () => {
  it("counts an intentional browser GET and uses only the first forwarded address", () => {
    const request = clickRequest();
    expect(shouldCountOutboundRequest(request)).toBe(true);
    expect(clientAddress(request)).toBe("203.0.113.42");
  });

  it.each([
    { purpose: "prefetch" },
    { "sec-purpose": "prefetch;prerender" },
    { "next-router-prefetch": "1" },
    { "user-agent": "Googlebot/2.1" },
    { "user-agent": "facebookexternalhit/1.1" },
  ])("suppresses bots and speculative requests: %o", (headers) => {
    expect(shouldCountOutboundRequest(clickRequest(headers))).toBe(false);
  });

  it("domain-separates the irreversible visitor digest", () => {
    const input = {
      businessDate: "2026-08-29",
      clientAddress: "203.0.113.42",
      listingId: "listing-a",
      secret: "secret",
      userAgent: "browser",
    };
    const digest = outboundVisitorHmac(input);
    expect(digest).toBe(
      createHmac("sha256", "secret")
        .update("goneviral:outbound-click:v1\0")
        .update("listing-a")
        .update("\0")
        .update("2026-08-29")
        .update("\0")
        .update("203.0.113.42")
        .update("\0")
        .update("browser")
        .digest("hex"),
    );
    expect(digest).not.toContain(input.clientAddress);
    expect(outboundVisitorHmac({ ...input, listingId: "listing-b" })).not.toBe(
      digest,
    );
    expect(
      outboundVisitorHmac({ ...input, businessDate: "2026-08-30" }),
    ).not.toBe(digest);
  });
});
