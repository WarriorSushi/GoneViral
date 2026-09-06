import "server-only";

import { createHmac } from "node:crypto";

import type postgres from "postgres";

import { readServerEnv } from "@/config/env/server";
import { toIstBusinessDate } from "@/domain/today";
import {
  clientAddress,
  shouldCountBrowserRequest,
} from "@/server/clicks/outbound-redirect";
import { getSqlClient } from "@/server/db/client";

type Transaction = postgres.TransactionSql<{ bigint: bigint }>;

export function siteVisitorHmac(input: {
  businessDate: string;
  clientAddress: string;
  secret: string;
  userAgent: string;
}): string {
  return createHmac("sha256", input.secret)
    .update("goneviral:site-visit:v1\0")
    .update(input.businessDate)
    .update("\0")
    .update(input.clientAddress)
    .update("\0")
    .update(input.userAgent.slice(0, 512))
    .digest("hex");
}

async function totalVisits(transaction: Transaction): Promise<string> {
  const [total] = await transaction<{ total: bigint }[]>`
    SELECT COALESCE(sum(unique_visits), 0)::bigint AS total
    FROM private.site_visit_daily_totals
  `;
  return (total?.total ?? 0n).toString();
}

async function recordUniqueVisit(
  transaction: Transaction,
  input: {
    businessDate: string;
    currentHmac: string;
    previousHmac?: string;
  },
): Promise<{ counted: boolean; totalVisits: string }> {
  const knownHmacs = input.previousHmac
    ? [input.currentHmac, input.previousHmac]
    : [input.currentHmac];
  const [existing] = await transaction<{ present: number }[]>`
    SELECT 1 AS present
    FROM private.site_visit_dedupe
    WHERE business_date = ${input.businessDate}
      AND visitor_hmac IN ${transaction(knownHmacs)}
    LIMIT 1
  `;
  if (existing) {
    return { counted: false, totalVisits: await totalVisits(transaction) };
  }

  const inserted = await transaction<{ visitorHmac: string }[]>`
    INSERT INTO private.site_visit_dedupe (
      business_date, visitor_hmac, expires_at
    ) VALUES (
      ${input.businessDate}, ${input.currentHmac},
      transaction_timestamp() + interval '8 days'
    )
    ON CONFLICT DO NOTHING
    RETURNING visitor_hmac AS "visitorHmac"
  `;
  if (inserted.length === 0) {
    return { counted: false, totalVisits: await totalVisits(transaction) };
  }

  await transaction`
    INSERT INTO private.site_visit_daily_totals (
      business_date, unique_visits
    ) VALUES (${input.businessDate}, 1)
    ON CONFLICT (business_date) DO UPDATE
    SET unique_visits = private.site_visit_daily_totals.unique_visits + 1,
        updated_at = transaction_timestamp()
  `;
  return { counted: true, totalVisits: await totalVisits(transaction) };
}

export async function countSiteVisit(input: {
  now?: Date;
  request: Request;
}): Promise<{ counted: boolean; totalVisits: string }> {
  const businessDate = toIstBusinessDate(input.now ?? new Date());
  const environment = readServerEnv();
  const address = clientAddress(input.request);
  const userAgent = input.request.headers.get("user-agent")?.trim() ?? "";
  const sql = getSqlClient();

  if (
    !environment.CLICK_HMAC_SECRET_CURRENT ||
    !address ||
    !shouldCountBrowserRequest(input.request)
  ) {
    return sql.begin(async (transaction) => ({
      counted: false,
      totalVisits: await totalVisits(transaction),
    }));
  }

  // ponytail: IP+UA daily dedupe is an estimate; add managed bot filtering only
  // if observed abuse makes the public count materially inaccurate.
  const digestInput = { businessDate, clientAddress: address, userAgent };
  const currentHmac = siteVisitorHmac({
    ...digestInput,
    secret: environment.CLICK_HMAC_SECRET_CURRENT,
  });
  const previousHmac = environment.CLICK_HMAC_SECRET_PREVIOUS
    ? siteVisitorHmac({
        ...digestInput,
        secret: environment.CLICK_HMAC_SECRET_PREVIOUS,
      })
    : undefined;

  return sql.begin((transaction) =>
    recordUniqueVisit(transaction, {
      businessDate,
      currentHmac,
      ...(previousHmac ? { previousHmac } : {}),
    }),
  );
}

export async function deleteExpiredSiteVisitDedupe(now = new Date()) {
  const result = await getSqlClient()`
    DELETE FROM private.site_visit_dedupe WHERE expires_at <= ${now}
  `;
  return result.count;
}
