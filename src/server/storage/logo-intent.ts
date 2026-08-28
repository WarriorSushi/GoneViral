import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { readServerEnv } from "@/config/env/server";

type LogoIntent = Readonly<{
  assetId: string;
  expiresAt: number;
  userId: string;
}>;

function secret(): string {
  const value = readServerEnv().SUBMISSION_HMAC_SECRET;
  if (!value) throw new Error("Logo upload signing is not configured.");
  return value;
}

function signature(payload: string) {
  return createHmac("sha256", secret())
    .update(`goneviral-logo-upload\0${payload}`)
    .digest("base64url");
}

export function signLogoUploadIntent(intent: LogoIntent): string {
  const payload = Buffer.from(JSON.stringify(intent), "utf8").toString(
    "base64url",
  );
  return `${payload}.${signature(payload)}`;
}

export function verifyLogoUploadIntent(
  token: string,
  now = Date.now(),
): LogoIntent | null {
  const [payload, provided, extra] = token.split(".");
  if (!payload || !provided || extra || token.length > 1_024) return null;
  const expected = signature(payload);
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right))
    return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<LogoIntent>;
    if (
      typeof parsed.assetId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(parsed.assetId) ||
      typeof parsed.userId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(parsed.userId) ||
      typeof parsed.expiresAt !== "number" ||
      !Number.isSafeInteger(parsed.expiresAt) ||
      parsed.expiresAt <= now
    ) {
      return null;
    }
    return parsed as LogoIntent;
  } catch {
    return null;
  }
}
