import { randomUUID } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  CLOUDFLARE_TURNSTILE_TEST_SECRET_KEY,
  CloudflareTurnstileVerifier,
  MockTurnstileVerifier,
} from "@/server/security/turnstile";

afterEach(() => {
  vi.unstubAllGlobals();
});

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

describe("Cloudflare Turnstile boundary", () => {
  it("keeps strict action and hostname checks for real widgets", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          action: "join",
          hostname: "preview.example.com",
          success: true,
        }),
      ),
    );
    const verifier = new CloudflareTurnstileVerifier(
      "real-secret",
      "preview.example.com",
    );
    expect(
      await verifier.verify({ expectedAction: "join", token: "real-token" }),
    ).toEqual({ ok: true });

    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({
        action: "report",
        hostname: "preview.example.com",
        success: true,
      }),
    );
    expect(
      await verifier.verify({ expectedAction: "join", token: "real-token-2" }),
    ).toEqual({ code: "failed", ok: false });
  });

  it("accepts only Cloudflare's documented dummy token in test profile", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          Response.json({
            action: "test",
            hostname: "localhost",
            success: true,
          }),
        ),
      ),
    );
    const verifier = new CloudflareTurnstileVerifier(
      CLOUDFLARE_TURNSTILE_TEST_SECRET_KEY,
      "goneviral-preview.vercel.app",
      "official_test",
    );
    expect(
      await verifier.verify({
        expectedAction: "join",
        token: "XXXX.DUMMY.TOKEN.XXXX",
      }),
    ).toEqual({ ok: true });
    expect(
      await verifier.verify({
        expectedAction: "join",
        token: "not-the-documented-dummy-token",
      }),
    ).toEqual({ code: "failed", ok: false });
  });
});
