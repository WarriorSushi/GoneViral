import { execFileSync } from "node:child_process";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  countEligibleOutboundClick,
  deleteExpiredClickDedupe,
  resolveEligibleOutboundSlug,
} from "@/server/clicks/outbound-redirect";
import { closeDatabase, getSqlClient } from "@/server/db/client";
import {
  listMainBoard,
  listPublicActivity,
} from "@/server/db/repositories/leaderboards";

const runtimeDatabaseUrl =
  "postgresql://postgres.pooler-dev:postgres@127.0.0.1:54329/postgres";
const directDatabaseUrl =
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

beforeAll(async () => {
  process.env.DATABASE_URL = runtimeDatabaseUrl;
  process.env.DATABASE_DIRECT_URL = directDatabaseUrl;
  process.env.CLICK_HMAC_SECRET_CURRENT = "phase11-old-secret";
  execFileSync(process.execPath, ["scripts/db/phase3-fixtures.mjs", "seed"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
  await getSqlClient()`
    UPDATE app.listings
    SET destination_url = CASE slug
      WHEN 'monsoon-studio' THEN 'https://example.com/monsoon'
      WHEN 'nukkad-notes' THEN 'https://example.org/nukkad'
      ELSE destination_url
    END
    WHERE slug IN ('monsoon-studio', 'nukkad-notes')
  `;
});

afterAll(async () => {
  await getSqlClient()`
    DELETE FROM private.click_dedupe
    WHERE listing_id IN (
      SELECT id FROM app.listings WHERE public_id LIKE 'fixture-%'
    )
  `;
  await getSqlClient()`
    DELETE FROM app.listing_click_daily_totals
    WHERE listing_id IN (
      SELECT id FROM app.listings WHERE public_id LIKE 'fixture-%'
    )
  `;
  await closeDatabase();
  execFileSync(process.execPath, ["scripts/db/phase3-fixtures.mjs", "clear"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
});

function browserRequest(headers: Record<string, string> = {}) {
  return new Request("https://goneviral.in/go/fixture", {
    headers: {
      "user-agent": "Mozilla/5.0 Phase11Browser",
      "x-forwarded-for": "203.0.113.77",
      ...headers,
    },
  });
}

describe("Phase 11 redirect, click, and activity integration", () => {
  it("revalidates public eligibility and the stored destination", async () => {
    await expect(
      resolveEligibleOutboundSlug("monsoon-studio"),
    ).resolves.toEqual(
      expect.objectContaining({
        destinationUrl: "https://example.com/monsoon",
        slug: "monsoon-studio",
      }),
    );
    await expect(
      resolveEligibleOutboundSlug("suspended-fixture"),
    ).resolves.toBeNull();
    await expect(
      resolveEligibleOutboundSlug("plotline-app"),
    ).resolves.toBeNull();
    await expect(
      resolveEligibleOutboundSlug("missing-fixture"),
    ).resolves.toBeNull();
  });

  it("counts once per listing and IST day, survives secret rotation, and never changes rank", async () => {
    const firstListing = await resolveEligibleOutboundSlug("monsoon-studio");
    const secondListing = await resolveEligibleOutboundSlug("nukkad-notes");
    expect(firstListing).not.toBeNull();
    expect(secondListing).not.toBeNull();
    if (!firstListing || !secondListing) return;

    const ranksBefore = (await listMainBoard({ cursor: null })).entries.map(
      ({ rank, slug }) => ({ rank, slug }),
    );
    const dayOne = new Date("2026-08-29T10:00:00.000Z");
    const dayTwo = new Date("2026-08-30T10:00:00.000Z");

    await expect(
      countEligibleOutboundClick({
        listing: firstListing,
        now: dayOne,
        request: browserRequest(),
      }),
    ).resolves.toMatchObject({ counted: true });
    await expect(
      countEligibleOutboundClick({
        listing: firstListing,
        now: dayOne,
        request: browserRequest(),
      }),
    ).resolves.toMatchObject({ counted: false });

    process.env.CLICK_HMAC_SECRET_PREVIOUS = "phase11-old-secret";
    process.env.CLICK_HMAC_SECRET_CURRENT = "phase11-new-secret";
    await expect(
      countEligibleOutboundClick({
        listing: firstListing,
        now: dayOne,
        request: browserRequest(),
      }),
    ).resolves.toMatchObject({ counted: false });

    await expect(
      countEligibleOutboundClick({
        listing: firstListing,
        now: dayTwo,
        request: browserRequest(),
      }),
    ).resolves.toMatchObject({ counted: true });
    await expect(
      countEligibleOutboundClick({
        listing: secondListing,
        now: dayOne,
        request: browserRequest(),
      }),
    ).resolves.toMatchObject({ counted: true });
    await expect(
      countEligibleOutboundClick({
        listing: firstListing,
        now: dayTwo,
        request: browserRequest({ purpose: "prefetch" }),
      }),
    ).resolves.toMatchObject({ counted: false });
    await expect(
      countEligibleOutboundClick({
        listing: firstListing,
        now: dayTwo,
        request: browserRequest({ "user-agent": "Googlebot/2.1" }),
      }),
    ).resolves.toMatchObject({ counted: false });

    const totals = await getSqlClient()<
      { businessDate: string; slug: string; uniqueClicks: bigint }[]
    >`
      SELECT listing.slug, total.business_date::text AS "businessDate",
             total.unique_clicks AS "uniqueClicks"
      FROM app.listing_click_daily_totals AS total
      JOIN app.listings AS listing ON listing.id = total.listing_id
      WHERE listing.slug IN ('monsoon-studio', 'nukkad-notes')
      ORDER BY listing.slug, total.business_date
    `;
    expect(totals).toEqual([
      { businessDate: "2026-08-29", slug: "monsoon-studio", uniqueClicks: 1n },
      { businessDate: "2026-08-30", slug: "monsoon-studio", uniqueClicks: 1n },
      { businessDate: "2026-08-29", slug: "nukkad-notes", uniqueClicks: 1n },
    ]);
    const ranksAfter = (await listMainBoard({ cursor: null })).entries.map(
      ({ rank, slug }) => ({ rank, slug }),
    );
    expect(ranksAfter).toEqual(ranksBefore);
    const firstBoardEntry = (
      await listMainBoard({ cursor: null })
    ).entries.find((entry) => entry.slug === "monsoon-studio");
    expect(firstBoardEntry?.uniqueClicks).toBe("2");

    const dedupeRows = await getSqlClient()<{ visitorHmac: string }[]>`
      SELECT visitor_hmac AS "visitorHmac" FROM private.click_dedupe
      WHERE listing_id = ${firstListing.listingId}
    `;
    expect(dedupeRows).toHaveLength(2);
    expect(JSON.stringify(dedupeRows)).not.toContain("203.0.113.77");
    expect(JSON.stringify(dedupeRows)).not.toMatch(/@/);
  });

  it("deletes expired dedupe identifiers without deleting daily aggregates", async () => {
    await getSqlClient()`
      UPDATE private.click_dedupe
      SET created_at = transaction_timestamp() - interval '10 days',
          expires_at = transaction_timestamp() - interval '1 day'
      WHERE listing_id IN (
        SELECT id FROM app.listings
        WHERE slug IN ('monsoon-studio', 'nukkad-notes')
      )
    `;
    expect(await deleteExpiredClickDedupe()).toBeGreaterThanOrEqual(3);
    const [aggregate] = await getSqlClient()<[{ total: bigint }]>`
      SELECT sum(unique_clicks)::bigint AS total
      FROM app.listing_click_daily_totals
      WHERE listing_id IN (
        SELECT id FROM app.listings
        WHERE slug IN ('monsoon-studio', 'nukkad-notes')
      )
    `;
    expect(aggregate?.total).toBe(3n);
  });

  it("publishes committed activity without private payment or payer data", async () => {
    const activity = await listPublicActivity();
    expect(activity.length).toBeGreaterThan(0);
    expect(activity[0]).toEqual(
      expect.objectContaining({
        currentMainRank: expect.stringMatching(/^\d+$/),
        kind: expect.stringMatching(/^(joined|added|restored)$/),
        listingSlug: expect.any(String),
      }),
    );
    const serialized = JSON.stringify(activity);
    expect(serialized).not.toMatch(
      /provider|paymentId|payer|customer|email|dispute|chargeback/i,
    );
  });
});
