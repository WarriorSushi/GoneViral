import { describe, expect, it } from "vitest";

import { canonicalizeDestination } from "@/domain/destination";

describe("destination canonicalization and safety", () => {
  it("canonicalizes host, default port, fragment, and Unicode domains", () => {
    expect(
      canonicalizeDestination("https://BÜCHER.de:443/path?q=1#section"),
    ).toEqual({
      ok: true,
      value: {
        canonicalKey: "https://xn--bcher-kva.de/path?q=1",
        host: "xn--bcher-kva.de",
        url: "https://xn--bcher-kva.de/path?q=1",
      },
    });
  });

  it.each([
    "http://example.com",
    "https://localhost",
    "https://127.0.0.1",
    "https://[::1]",
    "https://user:pass@example.com",
    "https://service.internal",
    "https://reserved.example",
    "https://bit.ly/example",
  ])("rejects unsafe destination %s", (destination) => {
    expect(canonicalizeDestination(destination).ok).toBe(false);
  });

  it("retains meaningful path and query differences for duplicate keys", () => {
    const first = canonicalizeDestination("https://example.com/a?ref=one");
    const second = canonicalizeDestination("https://example.com/a?ref=two");
    expect(first.ok && second.ok && first.value.canonicalKey).not.toBe(
      second.ok && second.value.canonicalKey,
    );
  });
});
