import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  countSiteVisit,
  deleteExpiredSiteVisitDedupe,
} from "@/server/analytics/site-visits";
import { closeDatabase, getSqlClient } from "@/server/db/client";

const runtimeDatabaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres.pooler-dev:postgres@127.0.0.1:54329/postgres";
const directDatabaseUrl =
  process.env.DATABASE_DIRECT_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

beforeAll(async () => {
  process.env.DATABASE_URL = runtimeDatabaseUrl;
  process.env.DATABASE_DIRECT_URL = directDatabaseUrl;
  process.env.CLICK_HMAC_SECRET_CURRENT = "site-visit-old-secret";
  await getSqlClient()`TRUNCATE private.site_visit_dedupe, private.site_visit_daily_totals`;
});

afterAll(async () => {
  await getSqlClient()`TRUNCATE private.site_visit_dedupe, private.site_visit_daily_totals`;
  await closeDatabase();
});

function browserRequest(headers: Record<string, string> = {}) {
  return new Request("https://goneviral.in/api/site-visits", {
    headers: {
      "user-agent": "Mozilla/5.0 SiteVisitBrowser",
      "x-forwarded-for": "203.0.113.88",
      ...headers,
    },
    method: "POST",
  });
}

describe("site visit counter integration", () => {
  it("counts one visit per browser and IST day across secret rotation", async () => {
    const dayOne = new Date("2026-09-06T10:00:00.000Z");
    const dayTwo = new Date("2026-09-07T10:00:00.000Z");

    await expect(
      countSiteVisit({ now: dayOne, request: browserRequest() }),
    ).resolves.toEqual({ counted: true, totalVisits: "1" });
    await expect(
      countSiteVisit({ now: dayOne, request: browserRequest() }),
    ).resolves.toEqual({ counted: false, totalVisits: "1" });

    process.env.CLICK_HMAC_SECRET_PREVIOUS = "site-visit-old-secret";
    process.env.CLICK_HMAC_SECRET_CURRENT = "site-visit-new-secret";
    await expect(
      countSiteVisit({ now: dayOne, request: browserRequest() }),
    ).resolves.toEqual({ counted: false, totalVisits: "1" });
    await expect(
      countSiteVisit({ now: dayTwo, request: browserRequest() }),
    ).resolves.toEqual({ counted: true, totalVisits: "2" });
    await expect(
      countSiteVisit({
        now: dayTwo,
        request: browserRequest({ "user-agent": "Googlebot/2.1" }),
      }),
    ).resolves.toEqual({ counted: false, totalVisits: "2" });

    const totals = await getSqlClient()<
      { businessDate: string; uniqueVisits: bigint }[]
    >`
      SELECT business_date::text AS "businessDate",
             unique_visits AS "uniqueVisits"
      FROM private.site_visit_daily_totals
      ORDER BY business_date
    `;
    expect(totals).toEqual([
      { businessDate: "2026-09-06", uniqueVisits: 1n },
      { businessDate: "2026-09-07", uniqueVisits: 1n },
    ]);

    const dedupe = await getSqlClient()<{ visitorHmac: string }[]>`
      SELECT visitor_hmac AS "visitorHmac" FROM private.site_visit_dedupe
    `;
    expect(dedupe).toHaveLength(2);
    expect(JSON.stringify(dedupe)).not.toContain("203.0.113.88");
  });

  it("removes expired daily digests without changing the cumulative total", async () => {
    await getSqlClient()`
      UPDATE private.site_visit_dedupe
      SET created_at = transaction_timestamp() - interval '10 days',
          expires_at = transaction_timestamp() - interval '1 day'
    `;
    expect(await deleteExpiredSiteVisitDedupe()).toBe(2);
    const [total] = await getSqlClient()<[{ total: bigint }]>`
      SELECT sum(unique_visits)::bigint AS total
      FROM private.site_visit_daily_totals
    `;
    expect(total?.total).toBe(2n);
  });
});
