import "server-only";

import { getSqlClient } from "@/server/db/client";

import { submissionDigest } from "./submission-security";

export async function consumeStatusRateLimit(
  remoteIp: string,
  publicId: string,
): Promise<boolean> {
  const windowSeconds = Math.floor(Date.now() / 60_000) * 60;
  const windowStart = new Date(windowSeconds * 1_000);
  const expiresAt = new Date((windowSeconds + 120) * 1_000);
  const subject = submissionDigest(`${remoteIp}\0${publicId}`);
  const rows = await getSqlClient()<{ count: bigint }[]>`
    INSERT INTO private.rate_limit_buckets (
      scope, subject_hmac, window_start, count, expires_at
    ) VALUES ('status', ${subject}, ${windowStart.toISOString()}, 1, ${expiresAt.toISOString()})
    ON CONFLICT (scope, subject_hmac, window_start)
    DO UPDATE SET count = private.rate_limit_buckets.count + 1
    RETURNING count
  `;
  return (rows[0]?.count ?? 31n) <= 30n;
}
