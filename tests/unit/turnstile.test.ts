import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { MockTurnstileVerifier } from "@/server/security/turnstile";

describe("local Turnstile boundary", () => {
  it("accepts a valid token only once", async () => {
    const verifier = new MockTurnstileVerifier();
    const token = `local-pass-${randomUUID()}`;
    const request = { expectedAction: "join" as const, token };
    expect(await verifier.verify(request)).toEqual({ ok: true });
    expect(await verifier.verify(request)).toEqual({
      code: "reused",
      ok: false,
    });
  });

  it("fails closed for invalid and timed-out tokens", async () => {
    const verifier = new MockTurnstileVerifier();
    expect(
      await verifier.verify({
        expectedAction: "join",
        token: `invalid-${randomUUID()}`,
      }),
    ).toEqual({ code: "failed", ok: false });
    expect(
      await verifier.verify({
        expectedAction: "join",
        token: `local-timeout-${randomUUID()}`,
      }),
    ).toEqual({ code: "timeout", ok: false });
  });
});
