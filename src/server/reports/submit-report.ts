import "server-only";

import { randomBytes } from "node:crypto";

import type { ReportInput } from "@/domain/report";
import { getSqlClient } from "@/server/db/client";
import { mutationsAreReadOnly } from "@/server/operations/flags";
import { encryptPrivateText } from "@/server/security/private-data";
import { submissionDigest } from "@/server/security/submission-security";
import type { TurnstileVerifier } from "@/server/security/turnstile";

export type SubmitReportResult = Readonly<{
  kind: "accepted" | "rejected" | "unavailable";
}>;

export async function submitPublicReport(input: {
  listingSlug: string;
  remoteIp: string;
  report: ReportInput;
  turnstile: TurnstileVerifier;
  userAgent: string;
}): Promise<SubmitReportResult> {
  if (await mutationsAreReadOnly()) return { kind: "unavailable" };
  const verification = await input.turnstile.verify({
    expectedAction: "report",
    remoteIp: input.remoteIp,
    token: input.report.turnstileToken,
  });
  if (!verification.ok) return { kind: "rejected" };

  return getSqlClient().begin(async (transaction) => {
    const [listing] = await transaction<{ id: string }[]>`
      SELECT id FROM app.listings WHERE slug = ${input.listingSlug} LIMIT 1
    `;
    if (!listing) return { kind: "accepted" } as const;

    const fingerprint = submissionDigest(
      `${input.remoteIp}\n${input.userAgent.slice(0, 240)}\n${listing.id}`,
    );
    const policies = [
      {
        limit: 5n,
        scope: "report_ip",
        seconds: 900,
        subject: input.remoteIp,
      },
      {
        limit: 8n,
        scope: "report_listing",
        seconds: 3_600,
        subject: listing.id,
      },
    ] as const;
    for (const policy of policies) {
      const nowSeconds = Math.floor(Date.now() / 1_000);
      const startSeconds =
        Math.floor(nowSeconds / policy.seconds) * policy.seconds;
      const [bucket] = await transaction<{ count: bigint }[]>`
        INSERT INTO private.rate_limit_buckets (
          scope, subject_hmac, window_start, count, expires_at
        ) VALUES (
          ${policy.scope}, ${submissionDigest(policy.subject)},
          ${new Date(startSeconds * 1_000).toISOString()}, 1,
          ${new Date((startSeconds + policy.seconds * 2) * 1_000).toISOString()}
        ) ON CONFLICT (scope, subject_hmac, window_start)
        DO UPDATE SET count = private.rate_limit_buckets.count + 1
        RETURNING count
      `;
      if (!bucket || bucket.count > policy.limit)
        return { kind: "accepted" } as const;
    }

    const [duplicate] = await transaction<{ present: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM private.reports
        WHERE listing_id = ${listing.id}
          AND request_fingerprint = ${fingerprint}
          AND reason_category = ${input.report.reason}
          AND created_at > transaction_timestamp() - interval '24 hours'
      ) AS present
    `;
    if (duplicate?.present) return { kind: "accepted" } as const;

    await transaction`
      INSERT INTO private.reports (
        public_id, listing_id, reason_category, explanation,
        reporter_email_encrypted, reporter_email_hash,
        request_fingerprint, state, turnstile_result
      ) VALUES (
        ${`rpt_${randomBytes(18).toString("base64url")}`}, ${listing.id},
        ${input.report.reason}, ${input.report.explanation},
        ${input.report.email ? encryptPrivateText(input.report.email) : null},
        ${input.report.email ? submissionDigest(input.report.email) : null},
        ${fingerprint}, 'pending', 'passed'
      )
    `;
    return { kind: "accepted" } as const;
  });
}
