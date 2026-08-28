import { execFileSync } from "node:child_process";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { toIstBusinessDate } from "@/domain/today";
import { closeDatabase } from "@/server/db/client";
import {
  estimateNewListingRank,
  getPublicListingDetail,
  listMainBoard,
  listTodayBoard,
  parseMainBoardCursor,
} from "@/server/db/repositories/leaderboards";

const runtimeDatabaseUrl =
  "postgresql://postgres.pooler-dev:postgres@127.0.0.1:54329/postgres";
const directDatabaseUrl =
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

beforeAll(() => {
  process.env.DATABASE_URL = runtimeDatabaseUrl;
  process.env.DATABASE_DIRECT_URL = directDatabaseUrl;
  execFileSync(process.execPath, ["scripts/db/phase3-fixtures.mjs", "seed"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
});

afterAll(async () => {
  await closeDatabase();
  execFileSync(process.execPath, ["scripts/db/phase3-fixtures.mjs", "clear"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
});

describe("Phase 3 public read model", () => {
  it("orders Main deterministically and excludes every hidden state", async () => {
    const board = await listMainBoard({ cursor: null });
    expect(board.entries.map((entry) => [entry.rank, entry.slug])).toEqual([
      ["1", "monsoon-studio"],
      ["2", "nukkad-notes"],
      ["3", "plotline-app"],
      ["4", "chai-and-code"],
      ["5", "mitti-home"],
    ]);
    expect(board.entries.map((entry) => entry.slug)).not.toContain(
      "suspended-fixture",
    );
    expect(board.entries.map((entry) => entry.slug)).not.toContain(
      "removed-fixture",
    );
    expect(board.entries.map((entry) => entry.slug)).not.toContain(
      "reversed-fixture",
    );
  });

  it("filters a category before ranking while retaining tie rules", async () => {
    const board = await listMainBoard({
      categorySlug: "tech-apps",
      cursor: null,
    });
    expect(board.entries.map((entry) => [entry.rank, entry.slug])).toEqual([
      ["1", "plotline-app"],
    ]);
  });

  it("uses a stable keyset cursor without duplicate or reset ranks", async () => {
    const first = await listMainBoard({ cursor: null, limit: 2 });
    expect(first.entries.map((entry) => entry.rank)).toEqual(["1", "2"]);
    expect(first.nextCursor).not.toBeNull();
    const parsed = parseMainBoardCursor(first.nextCursor ?? undefined);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const second = await listMainBoard({ cursor: parsed.value, limit: 2 });
    expect(second.entries.map((entry) => entry.rank)).toEqual(["3", "4"]);
    expect(second.entries.map((entry) => entry.publicId)).not.toEqual(
      first.entries.map((entry) => entry.publicId),
    );
  });

  it("orders Today by the explicit current IST business date only", async () => {
    const businessDate = toIstBusinessDate(new Date());
    const board = await listTodayBoard({ businessDate, cursor: null });
    expect(board.businessDate).toBe(businessDate);
    expect(board.entries.map((entry) => [entry.rank, entry.slug])).toEqual([
      ["1", "monsoon-studio"],
      ["2", "nukkad-notes"],
      ["3", "mitti-home"],
    ]);
    expect(board.entries.map((entry) => entry.slug)).not.toContain(
      "plotline-app",
    );
  });

  it("returns public listing detail and real allowlisted movement only", async () => {
    const businessDate = toIstBusinessDate(new Date());
    const detail = await getPublicListingDetail({
      businessDate,
      slug: "monsoon-studio",
    });
    expect(detail).not.toBeNull();
    expect(detail?.movements).toEqual([
      expect.objectContaining({ kind: "joined", amountDeltaPaise: "2500000" }),
    ]);
    expect(
      await getPublicListingDetail({
        businessDate,
        slug: "suspended-fixture",
      }),
    ).toBeNull();
  });

  it("snapshots a strict DTO shape with no private financial or owner fields", async () => {
    const board = await listMainBoard({ cursor: null, limit: 1 });
    const entry = board.entries[0]!;
    const stableSnapshot = {
      ...entry,
      currentTotalReachedAt: "__REACHED_AT__",
      takeoverQuote: {
        ...entry.takeoverQuote,
        estimatedAt: "__ESTIMATED_AT__",
      },
    };
    expect(stableSnapshot).toMatchInlineSnapshot(`
      {
        "category": {
          "name": "B2B & Services",
          "slug": "b2b-services",
          "sortOrder": 4,
        },
        "confirmedTotalPaise": "2500000",
        "currentTotalReachedAt": "__REACHED_AT__",
        "destinationUrl": "https://monsoon-studio.example.test",
        "logoUrl": null,
        "name": "Monsoon Studio",
        "publicId": "fixture-monsoon-studio",
        "rank": "1",
        "slug": "monsoon-studio",
        "tagline": "Independent motion and identity practice from Mumbai.",
        "takeoverQuote": {
          "estimatedAt": "__ESTIMATED_AT__",
          "policyVersion": "2026-08-28-v1",
          "requiredPaymentPaise": "2500100",
          "targetRank": "1",
          "targetTotalPaise": "2500000",
        },
      }
    `);
  });

  it("estimates a new equal-total listing below earlier incumbents", async () => {
    const estimate = await estimateNewListingRank({ amountPaise: 1_000_000n });
    expect(estimate.estimatedRank).toBe("5");
    expect(estimate.estimatedTotalPaise).toBe("1000000");
  });

  it("fails malformed cursors without reaching SQL", () => {
    expect(parseMainBoardCursor("not-a-valid-cursor")).toEqual({ ok: false });
  });
});
