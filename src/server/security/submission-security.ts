import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { readServerEnv } from "@/config/env/server";

const developmentSecret =
  "goneviral-local-submission-secret-not-for-production";

export function submissionDigest(value: string): string {
  const environment = readServerEnv();
  const secret = environment.SUBMISSION_HMAC_SECRET ?? developmentSecret;
  if (
    environment.NODE_ENV === "production" &&
    !environment.SUBMISSION_HMAC_SECRET
  ) {
    throw new Error("SUBMISSION_HMAC_SECRET is required in production.");
  }
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function equalDigest(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
