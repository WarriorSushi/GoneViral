import "server-only";

import { readServerEnv } from "@/config/env/server";

export type TurnstileResult =
  | Readonly<{ ok: true }>
  | Readonly<{ code: "failed" | "timeout" | "reused"; ok: false }>;

export interface TurnstileVerifier {
  verify(input: {
    expectedAction: "join" | "report";
    remoteIp?: string;
    token: string;
  }): Promise<TurnstileResult>;
}

const locallyUsedTokens = new Set<string>();

export class MockTurnstileVerifier implements TurnstileVerifier {
  async verify(input: {
    expectedAction: "join" | "report";
    remoteIp?: string;
    token: string;
  }): Promise<TurnstileResult> {
    if (locallyUsedTokens.has(input.token))
      return { code: "reused", ok: false };
    locallyUsedTokens.add(input.token);
    if (input.token.startsWith("local-pass-")) return { ok: true };
    if (input.token.startsWith("local-timeout-")) {
      return { code: "timeout", ok: false };
    }
    return { code: "failed", ok: false };
  }
}

type CloudflareResponse = {
  action?: string;
  hostname?: string;
  success?: boolean;
};

export const CLOUDFLARE_TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
export const CLOUDFLARE_TURNSTILE_TEST_SECRET_KEY =
  "1x0000000000000000000000000000000AA";
const CLOUDFLARE_TURNSTILE_TEST_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";

type CloudflareValidationProfile = "official_test" | "strict";

export class CloudflareTurnstileVerifier implements TurnstileVerifier {
  constructor(
    private readonly secret: string,
    private readonly allowedHostname: string,
    private readonly profile: CloudflareValidationProfile = "strict",
  ) {}

  async verify(input: {
    expectedAction: "join" | "report";
    remoteIp?: string;
    token: string;
  }): Promise<TurnstileResult> {
    const body = new URLSearchParams({
      secret: this.secret,
      response: input.token,
    });
    if (input.remoteIp) body.set("remoteip", input.remoteIp);

    try {
      const response = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          body,
          method: "POST",
          signal: AbortSignal.timeout(8_000),
        },
      );
      const payload = (await response.json()) as CloudflareResponse;
      const verified = response.ok && payload.success === true;
      if (this.profile === "official_test") {
        return verified &&
          this.secret === CLOUDFLARE_TURNSTILE_TEST_SECRET_KEY &&
          input.token === CLOUDFLARE_TURNSTILE_TEST_TOKEN
          ? { ok: true }
          : { code: "failed", ok: false };
      }
      return verified &&
        payload.action === input.expectedAction &&
        payload.hostname === this.allowedHostname
        ? { ok: true }
        : { code: "failed", ok: false };
    } catch {
      return { code: "timeout", ok: false };
    }
  }
}

export function getTurnstileVerifier(siteUrl: string): TurnstileVerifier {
  const environment = readServerEnv();
  if (environment.TURNSTILE_MODE === "mock") {
    const hostname = new URL(siteUrl).hostname;
    if (!new Set(["127.0.0.1", "localhost"]).has(hostname)) {
      throw new Error("Mock Turnstile is restricted to loopback hosts.");
    }
    return new MockTurnstileVerifier();
  }
  const allowedHostname = new URL(siteUrl).hostname;
  if (environment.TURNSTILE_MODE === "cloudflare_test") {
    if (
      process.env.VERCEL_ENV === "production" ||
      !allowedHostname.endsWith(".vercel.app") ||
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY !==
        CLOUDFLARE_TURNSTILE_TEST_SITE_KEY ||
      environment.TURNSTILE_SECRET_KEY !== CLOUDFLARE_TURNSTILE_TEST_SECRET_KEY
    ) {
      throw new Error(
        "Official Turnstile test mode is restricted to a Vercel Preview with the documented test key pair.",
      );
    }
    return new CloudflareTurnstileVerifier(
      environment.TURNSTILE_SECRET_KEY,
      allowedHostname,
      "official_test",
    );
  }
  return new CloudflareTurnstileVerifier(
    environment.TURNSTILE_SECRET_KEY!,
    allowedHostname,
  );
}
