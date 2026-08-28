import "server-only";

import { readServerEnv } from "@/config/env/server";

export type TurnstileResult =
  | Readonly<{ ok: true }>
  | Readonly<{ code: "failed" | "timeout" | "reused"; ok: false }>;

export interface TurnstileVerifier {
  verify(input: {
    expectedAction: "join";
    remoteIp?: string;
    token: string;
  }): Promise<TurnstileResult>;
}

const locallyUsedTokens = new Set<string>();

export class MockTurnstileVerifier implements TurnstileVerifier {
  async verify(input: {
    expectedAction: "join";
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

export class CloudflareTurnstileVerifier implements TurnstileVerifier {
  constructor(
    private readonly secret: string,
    private readonly allowedHostname: string,
  ) {}

  async verify(input: {
    expectedAction: "join";
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
      return response.ok &&
        payload.success === true &&
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
  return new CloudflareTurnstileVerifier(
    environment.TURNSTILE_SECRET_KEY!,
    new URL(siteUrl).hostname,
  );
}
