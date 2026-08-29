import { randomUUID } from "node:crypto";

import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const directDatabaseUrl =
  process.env.DATABASE_DIRECT_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
process.env.DATABASE_DIRECT_URL ??= directDatabaseUrl;
process.env.DATABASE_URL ??=
  "postgresql://postgres.pooler-dev:postgres@127.0.0.1:54329/postgres";
process.env.SUBMISSION_HMAC_SECRET ??= "phase10-report-hmac-secret";
process.env.PRIVATE_DATA_ENCRYPTION_KEY ??=
  "xtMT1+ly4wVTnz5uDGwQk21jGl4/Ro/GV6z9/imDAdg=";

const directSql = postgres(directDatabaseUrl, {
  max: 2,
  prepare: false,
  types: { bigint: postgres.BigInt },
});
const fixtureName = "Phase 10 report fixture";

async function cleanup() {
  const rows = await directSql<{ id: string }[]>`
    SELECT id FROM app.listings WHERE name = ${fixtureName}
  `;
  const ids = rows.map((row) => row.id);
  if (ids.length > 0) {
    await directSql`DELETE FROM private.reports WHERE listing_id = ANY(${ids}::uuid[])`;
    await directSql`DELETE FROM app.listings WHERE id = ANY(${ids}::uuid[])`;
  }
  await directSql`
    DELETE FROM private.rate_limit_buckets
    WHERE scope IN ('report_ip', 'report_listing')
  `;
}

beforeAll(cleanup);

afterAll(async () => {
  await cleanup();
  const { closeDatabase } = await import("@/server/db/client");
  await closeDatabase();
  await directSql.end({ timeout: 5 });
});

describe("public abuse reports", () => {
  it("returns a generic success, deduplicates, and cannot alter rank state", async () => {
    const suffix = randomUUID();
    const [listing] = await directSql<
      {
        confirmed_total_paise: bigint;
        id: string;
        lifecycle_status: string;
        moderation_status: string;
        slug: string;
      }[]
    >`
      INSERT INTO app.listings (
        public_id, slug, name, name_normalized, tagline, destination_url,
        destination_canonical_key, destination_host, category_id,
        lifecycle_status, moderation_status, confirmed_total_paise,
        original_sponsorship_paise, current_total_reached_at,
        first_confirmed_at, category_locked_at
      ) VALUES (
        ${`phase10-report-${suffix}`}, ${`phase10-report-${suffix}`},
        ${fixtureName}, 'phase 10 report fixture', 'Report isolation test',
        ${`https://report-${suffix}.example.test`},
        ${`https://report-${suffix}.example.test`},
        ${`report-${suffix}.example.test`},
        '00000000-0000-4000-8000-000000000002',
        'active', 'clear', 49900, 49900, now(), now(), now()
      ) RETURNING id, slug, lifecycle_status, moderation_status,
                  confirmed_total_paise
    `;
    expect(listing).toBeDefined();
    const { submitPublicReport } =
      await import("@/server/reports/submit-report");
    const verifier = {
      verify: vi.fn().mockResolvedValue({ ok: true as const }),
    };
    const request = {
      listingSlug: listing!.slug,
      remoteIp: `198.51.100.${Math.floor(Math.random() * 200) + 1}`,
      report: {
        email: "reporter@example.test",
        explanation:
          "This is a detailed synthetic explanation for moderation review.",
        reason: "scam" as const,
        turnstileToken: "phase10-proof",
      },
      turnstile: verifier,
      userAgent: "phase10-integration-test",
    };

    await expect(submitPublicReport(request)).resolves.toEqual({
      kind: "accepted",
    });
    await expect(submitPublicReport(request)).resolves.toEqual({
      kind: "accepted",
    });

    const [state] = await directSql<
      {
        confirmed_total_paise: bigint;
        lifecycle_status: string;
        moderation_status: string;
        reports: bigint;
      }[]
    >`
      SELECT listing.confirmed_total_paise, listing.lifecycle_status,
             listing.moderation_status, count(report.id)::bigint AS reports
      FROM app.listings AS listing
      LEFT JOIN private.reports AS report ON report.listing_id = listing.id
      WHERE listing.id = ${listing!.id}
      GROUP BY listing.id
    `;
    expect(state).toEqual({
      confirmed_total_paise: 49_900n,
      lifecycle_status: "active",
      moderation_status: "clear",
      reports: 1n,
    });
    expect(verifier.verify).toHaveBeenCalledWith(
      expect.objectContaining({ expectedAction: "report" }),
    );
  });

  it("does not reveal whether a missing listing exists", async () => {
    const { submitPublicReport } =
      await import("@/server/reports/submit-report");
    await expect(
      submitPublicReport({
        listingSlug: `missing-${randomUUID()}`,
        remoteIp: "203.0.113.10",
        report: {
          email: "",
          explanation: "This synthetic report has enough detail to be valid.",
          reason: "other",
          turnstileToken: "phase10-proof-missing",
        },
        turnstile: { verify: async () => ({ ok: true }) },
        userAgent: "phase10-integration-test",
      }),
    ).resolves.toEqual({ kind: "accepted" });
  });
});
