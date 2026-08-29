import "server-only";

import { Buffer } from "node:buffer";

import { z } from "zod";

import { moneyPaise } from "@/domain/money";
import { INITIAL_SPONSORSHIP_MIN_PAISE, POLICY_VERSION } from "@/domain/policy";
import { calculateTakeoverQuote } from "@/domain/ranking";
import { readPublicEnv } from "@/config/env/public";

import { getSqlClient } from "../client";
import type {
  PublicBoardPage,
  PublicActivityItem,
  PublicCategory,
  PublicEstimatedRank,
  PublicListingDetail,
  PublicMainBoardEntry,
  PublicMovement,
  PublicMovementKind,
  PublicTakeoverQuote,
  PublicTodayBoardEntry,
} from "./public-types";

function isoTimestamp(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const decimalBigint = z.string().regex(/^\d+$/);
const isoInstant = z.string().datetime({ offset: true });
const uuid = z.string().uuid();

const mainCursorSchema = z.object({
  totalPaise: decimalBigint,
  reachedAt: isoInstant,
  id: uuid,
});

const todayCursorSchema = z.object({
  businessDate: z.string().date(),
  netPaise: decimalBigint,
  reachedAt: isoInstant,
  id: uuid,
});

export type MainBoardCursor = z.infer<typeof mainCursorSchema>;
export type TodayBoardCursor = z.infer<typeof todayCursorSchema>;

export type CursorParseResult<TCursor> =
  Readonly<{ ok: true; value: TCursor | null }> | Readonly<{ ok: false }>;

function parseCursor<TCursor>(
  encoded: string | undefined,
  schema: z.ZodType<TCursor>,
): CursorParseResult<TCursor> {
  if (!encoded) {
    return { ok: true, value: null };
  }

  try {
    const decoded: unknown = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    );
    const parsed = schema.safeParse(decoded);
    return parsed.success ? { ok: true, value: parsed.data } : { ok: false };
  } catch {
    return { ok: false };
  }
}

function encodeCursor(value: object): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function parseMainBoardCursor(
  encoded: string | undefined,
): CursorParseResult<MainBoardCursor> {
  return parseCursor(encoded, mainCursorSchema);
}

export function parseTodayBoardCursor(
  encoded: string | undefined,
): CursorParseResult<TodayBoardCursor> {
  return parseCursor(encoded, todayCursorSchema);
}

function normalizePageSize(limit: number | undefined): number {
  if (limit === undefined) {
    return DEFAULT_PAGE_SIZE;
  }

  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    throw new RangeError(`Board page size must be from 1 to ${MAX_PAGE_SIZE}.`);
  }

  return limit;
}

function takeoverQuote(input: {
  estimatedAt: string;
  rank: bigint;
  targetTotalPaise: bigint;
}): PublicTakeoverQuote {
  const quote = calculateTakeoverQuote({
    listingCurrentTotalPaise: moneyPaise(0n),
    targetTotalPaise: moneyPaise(input.targetTotalPaise),
    minimumRequiredPaise: moneyPaise(INITIAL_SPONSORSHIP_MIN_PAISE),
  });

  return {
    estimatedAt: input.estimatedAt,
    policyVersion: quote.policyVersion,
    requiredPaymentPaise: quote.requiredPaymentPaise.toString(),
    targetRank: input.rank.toString(),
    targetTotalPaise: input.targetTotalPaise.toString(),
  };
}

type MainBoardRow = Readonly<{
  categoryName: string;
  categorySlug: string;
  categorySortOrder: number;
  confirmedTotalPaise: bigint;
  currentTotalReachedAt: Date;
  destinationUrl: string;
  id: string;
  logoPublicBucket: string | null;
  logoPublicObjectKey: string | null;
  name: string;
  publicId: string;
  rank: bigint;
  slug: string;
  tagline: string;
  uniqueClicks: bigint;
}>;

type TodayBoardRow = MainBoardRow &
  Readonly<{
    todayNetPaise: bigint;
    todayTotalReachedAt: Date;
  }>;

export type PublicSitemapEntry = Readonly<{
  slug: string;
  updatedAt: string;
}>;

function publicLogoUrl(row: MainBoardRow): string | null {
  const base = readPublicEnv().NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !row.logoPublicBucket || !row.logoPublicObjectKey) return null;
  const encodedPath = row.logoPublicObjectKey
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${encodeURIComponent(row.logoPublicBucket)}/${encodedPath}`;
}

function identityFromRow(row: MainBoardRow) {
  return {
    category: {
      name: row.categoryName,
      slug: row.categorySlug,
      sortOrder: row.categorySortOrder,
    },
    confirmedTotalPaise: row.confirmedTotalPaise.toString(),
    destinationUrl: row.destinationUrl,
    logoUrl: publicLogoUrl(row),
    name: row.name,
    publicId: row.publicId,
    slug: row.slug,
    tagline: row.tagline,
    uniqueClicks: row.uniqueClicks.toString(),
  } as const;
}

export async function listMainBoard(input: {
  categorySlug?: string;
  cursor: MainBoardCursor | null;
  limit?: number;
}): Promise<PublicBoardPage<PublicMainBoardEntry>> {
  const sql = getSqlClient();
  const limit = normalizePageSize(input.limit);
  const categoryPredicate = input.categorySlug
    ? sql`and c.slug = ${input.categorySlug} and c.is_active = true`
    : sql`and c.is_active = true`;
  const cursorPredicate = input.cursor
    ? sql`where (
        r."confirmedTotalPaise" < ${BigInt(input.cursor.totalPaise)}
        or (
          r."confirmedTotalPaise" = ${BigInt(input.cursor.totalPaise)}
          and r."currentTotalReachedAt" > ${new Date(input.cursor.reachedAt)}
        )
        or (
          r."confirmedTotalPaise" = ${BigInt(input.cursor.totalPaise)}
          and r."currentTotalReachedAt" = ${new Date(input.cursor.reachedAt)}
          and r.id > ${input.cursor.id}
        )
      )`
    : sql``;

  const rows = await sql<MainBoardRow[]>`
    with ranked as (
      select
        l.id,
        l.public_id as "publicId",
        l.slug,
        l.name,
        l.tagline,
        l.destination_url as "destinationUrl",
        l.confirmed_total_paise as "confirmedTotalPaise",
        l.current_total_reached_at as "currentTotalReachedAt",
        c.name as "categoryName",
        c.slug as "categorySlug",
        c.sort_order as "categorySortOrder",
        row_number() over (
          order by l.confirmed_total_paise desc,
                   l.current_total_reached_at asc,
                   l.id asc
        ) as rank
      from app.listings l
      inner join app.categories c on c.id = l.category_id
      where l.lifecycle_status = 'active'
        and l.moderation_status = 'clear'
        and l.confirmed_total_paise > 0
        and l.destination_url ~ '^https://'
        ${categoryPredicate}
    ), page as materialized (
      select * from ranked r
      ${cursorPredicate}
      order by r."confirmedTotalPaise" desc,
               r."currentTotalReachedAt" asc,
               r.id asc
      limit ${limit + 1}
    )
    select page.*,
           selected_asset.public_bucket as "logoPublicBucket",
           selected_asset.public_object_key as "logoPublicObjectKey",
           coalesce(clicks.unique_clicks, 0)::bigint as "uniqueClicks"
    from page
    left join app.listings source_listing on source_listing.id = page.id
    left join app.listing_assets selected_asset
      on selected_asset.id = source_listing.logo_asset_id
     and selected_asset.listing_id = source_listing.id
     and selected_asset.state = 'ready' and selected_asset.kind = 'logo'
    left join lateral (
      select sum(click.unique_clicks)::bigint as unique_clicks
      from app.listing_click_daily_totals click
      where click.listing_id = page.id
    ) clicks on true
    order by page."confirmedTotalPaise" desc,
             page."currentTotalReachedAt" asc,
             page.id asc
  `;

  const generatedAt = new Date().toISOString();
  const visibleRows = rows.slice(0, limit);
  const entries = visibleRows.map<PublicMainBoardEntry>((row) => ({
    ...identityFromRow(row),
    currentTotalReachedAt: isoTimestamp(row.currentTotalReachedAt),
    rank: row.rank.toString(),
    takeoverQuote: takeoverQuote({
      estimatedAt: generatedAt,
      rank: row.rank,
      targetTotalPaise: row.confirmedTotalPaise,
    }),
  }));
  const last = visibleRows.at(-1);

  return {
    businessDate: null,
    entries,
    generatedAt,
    nextCursor:
      rows.length > limit && last
        ? encodeCursor({
            totalPaise: last.confirmedTotalPaise.toString(),
            reachedAt: isoTimestamp(last.currentTotalReachedAt),
            id: last.id,
          })
        : null,
  };
}

export async function listTodayBoard(input: {
  businessDate: string;
  cursor: TodayBoardCursor | null;
  limit?: number;
}): Promise<PublicBoardPage<PublicTodayBoardEntry>> {
  const sql = getSqlClient();
  const limit = normalizePageSize(input.limit);

  if (input.cursor && input.cursor.businessDate !== input.businessDate) {
    throw new RangeError("Today cursor belongs to a different business date.");
  }

  const cursorPredicate = input.cursor
    ? sql`where (
        r."todayNetPaise" < ${BigInt(input.cursor.netPaise)}
        or (
          r."todayNetPaise" = ${BigInt(input.cursor.netPaise)}
          and r."todayTotalReachedAt" > ${new Date(input.cursor.reachedAt)}
        )
        or (
          r."todayNetPaise" = ${BigInt(input.cursor.netPaise)}
          and r."todayTotalReachedAt" = ${new Date(input.cursor.reachedAt)}
          and r.id > ${input.cursor.id}
        )
      )`
    : sql``;

  const rows = await sql<TodayBoardRow[]>`
    with ranked as (
      select
        l.id,
        l.public_id as "publicId",
        l.slug,
        l.name,
        l.tagline,
        l.destination_url as "destinationUrl",
        l.confirmed_total_paise as "confirmedTotalPaise",
        l.current_total_reached_at as "currentTotalReachedAt",
        c.name as "categoryName",
        c.slug as "categorySlug",
        c.sort_order as "categorySortOrder",
        d.net_amount_paise as "todayNetPaise",
        d.total_reached_at as "todayTotalReachedAt",
        row_number() over (
          order by d.net_amount_paise desc,
                   d.total_reached_at asc,
                   l.id asc
        ) as rank
      from app.listing_daily_totals d
      inner join app.listings l on l.id = d.listing_id
      inner join app.categories c on c.id = l.category_id
      where d.business_date = ${input.businessDate}
        and d.net_amount_paise > 0
        and l.lifecycle_status = 'active'
        and l.moderation_status = 'clear'
        and l.confirmed_total_paise > 0
        and l.destination_url ~ '^https://'
        and c.is_active = true
    ), page as materialized (
      select * from ranked r
      ${cursorPredicate}
      order by r."todayNetPaise" desc,
               r."todayTotalReachedAt" asc,
               r.id asc
      limit ${limit + 1}
    )
    select page.*,
           asset.public_bucket as "logoPublicBucket",
           asset.public_object_key as "logoPublicObjectKey",
           coalesce(clicks.unique_clicks, 0)::bigint as "uniqueClicks"
    from page
    left join app.listings source_listing on source_listing.id = page.id
    left join app.listing_assets asset
      on asset.id = source_listing.logo_asset_id
     and asset.listing_id = source_listing.id
     and asset.state = 'ready' and asset.kind = 'logo'
    left join lateral (
      select sum(click.unique_clicks)::bigint as unique_clicks
      from app.listing_click_daily_totals click
      where click.listing_id = page.id
    ) clicks on true
    order by page."todayNetPaise" desc,
             page."todayTotalReachedAt" asc,
             page.id asc
  `;

  const generatedAt = new Date().toISOString();
  const visibleRows = rows.slice(0, limit);
  const entries = visibleRows.map<PublicTodayBoardEntry>((row) => ({
    ...identityFromRow(row),
    rank: row.rank.toString(),
    takeoverQuote: takeoverQuote({
      estimatedAt: generatedAt,
      rank: row.rank,
      targetTotalPaise: row.confirmedTotalPaise,
    }),
    todayNetPaise: row.todayNetPaise.toString(),
    todayTotalReachedAt: isoTimestamp(row.todayTotalReachedAt),
  }));
  const last = visibleRows.at(-1);

  return {
    businessDate: input.businessDate,
    entries,
    generatedAt,
    nextCursor:
      rows.length > limit && last
        ? encodeCursor({
            businessDate: input.businessDate,
            netPaise: last.todayNetPaise.toString(),
            reachedAt: isoTimestamp(last.todayTotalReachedAt),
            id: last.id,
          })
        : null,
  };
}

type ListingDetailRow = MainBoardRow &
  Readonly<{
    todayNetPaise: bigint | null;
    todayRank: bigint | null;
  }>;

type MovementRow = Readonly<{
  amountDeltaPaise: bigint;
  appliedAt: Date;
  entryType: string;
}>;

function publicMovementKind(entryType: string): PublicMovementKind {
  switch (entryType) {
    case "initial_sponsorship":
      return "joined";
    case "raise":
      return "added";
    case "refund_restoration":
    case "chargeback_restoration":
      return "restored";
    default:
      return "adjusted";
  }
}

export async function getPublicListingDetail(input: {
  businessDate: string;
  slug: string;
}): Promise<PublicListingDetail | null> {
  const sql = getSqlClient();
  const [row] = await sql<ListingDetailRow[]>`
    with main_ranked as (
      select
        l.id,
        l.public_id as "publicId",
        l.slug,
        l.name,
        l.tagline,
        l.destination_url as "destinationUrl",
        l.confirmed_total_paise as "confirmedTotalPaise",
        l.current_total_reached_at as "currentTotalReachedAt",
        asset.public_bucket as "logoPublicBucket",
        asset.public_object_key as "logoPublicObjectKey",
        c.name as "categoryName",
        c.slug as "categorySlug",
        c.sort_order as "categorySortOrder",
        coalesce(clicks.unique_clicks, 0)::bigint as "uniqueClicks",
        row_number() over (
          order by l.confirmed_total_paise desc,
                   l.current_total_reached_at asc,
                   l.id asc
        ) as rank
      from app.listings l
      inner join app.categories c on c.id = l.category_id
      left join app.listing_assets asset
        on asset.id = l.logo_asset_id and asset.listing_id = l.id
       and asset.state = 'ready' and asset.kind = 'logo'
      left join lateral (
        select sum(click.unique_clicks)::bigint as unique_clicks
        from app.listing_click_daily_totals click
        where click.listing_id = l.id
      ) clicks on true
      where l.lifecycle_status = 'active'
        and l.moderation_status = 'clear'
        and l.confirmed_total_paise > 0
        and l.destination_url ~ '^https://'
        and c.is_active = true
    ), today_ranked as (
      select
        d.listing_id,
        d.net_amount_paise,
        row_number() over (
          order by d.net_amount_paise desc,
                   d.total_reached_at asc,
                   d.listing_id asc
        ) as rank
      from app.listing_daily_totals d
      inner join app.listings l on l.id = d.listing_id
      inner join app.categories c on c.id = l.category_id
      where d.business_date = ${input.businessDate}
        and d.net_amount_paise > 0
        and l.lifecycle_status = 'active'
        and l.moderation_status = 'clear'
        and l.confirmed_total_paise > 0
        and l.destination_url ~ '^https://'
        and c.is_active = true
    )
    select
      m.*,
      t.net_amount_paise as "todayNetPaise",
      t.rank as "todayRank"
    from main_ranked m
    left join today_ranked t on t.listing_id = m.id
    where m.slug = ${input.slug}
    limit 1
  `;

  if (!row) {
    return null;
  }

  const movementRows = await sql<MovementRow[]>`
    select
      entry_type as "entryType",
      amount_delta_paise as "amountDeltaPaise",
      applied_at as "appliedAt"
    from private.financial_ledger
    where listing_id = ${row.id}
    order by applied_at desc, id desc
    limit 12
  `;
  const generatedAt = new Date().toISOString();
  const movements = movementRows.map<PublicMovement>((movement) => ({
    amountDeltaPaise: movement.amountDeltaPaise.toString(),
    appliedAt: isoTimestamp(movement.appliedAt),
    kind: publicMovementKind(movement.entryType),
  }));

  return {
    ...identityFromRow(row),
    currentMainRank: row.rank.toString(),
    currentTotalReachedAt: isoTimestamp(row.currentTotalReachedAt),
    movements,
    takeoverQuote: takeoverQuote({
      estimatedAt: generatedAt,
      rank: row.rank,
      targetTotalPaise: row.confirmedTotalPaise,
    }),
    todayNetPaise: row.todayNetPaise?.toString() ?? null,
    todayRank: row.todayRank?.toString() ?? null,
  };
}

export async function estimateNewListingRank(input: {
  amountPaise: bigint;
  estimatedAt?: Date;
}): Promise<PublicEstimatedRank> {
  const sql = getSqlClient();
  const estimatedAt = input.estimatedAt ?? new Date();
  const hypotheticalId = "ffffffff-ffff-4fff-bfff-ffffffffffff";
  const [result] = await sql<{ estimatedRank: bigint }[]>`
    select (count(*) + 1)::bigint as "estimatedRank"
    from app.listings l
    inner join app.categories c on c.id = l.category_id
    where l.lifecycle_status = 'active'
      and l.moderation_status = 'clear'
      and l.confirmed_total_paise > 0
      and l.destination_url ~ '^https://'
      and c.is_active = true
      and (
        l.confirmed_total_paise > ${input.amountPaise}
        or (
          l.confirmed_total_paise = ${input.amountPaise}
          and l.current_total_reached_at < ${estimatedAt}
        )
        or (
          l.confirmed_total_paise = ${input.amountPaise}
          and l.current_total_reached_at = ${estimatedAt}
          and l.id < ${hypotheticalId}
        )
      )
  `;

  if (!result) {
    throw new Error("Estimated rank query did not return a result.");
  }

  return {
    estimatedAt: estimatedAt.toISOString(),
    estimatedRank: result.estimatedRank.toString(),
    estimatedTotalPaise: input.amountPaise.toString(),
    policyVersion: POLICY_VERSION,
  };
}

type ActivityRow = Readonly<{
  amountDeltaPaise: bigint;
  appliedAt: Date;
  currentMainRank: bigint;
  entryType: string;
  listingName: string;
  listingPublicId: string;
  listingSlug: string;
}>;

/** Only committed positive ledger movements and currently public identities. */
export async function listPublicActivity(
  limit = 12,
): Promise<PublicActivityItem[]> {
  const sql = getSqlClient();
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
    throw new RangeError("Activity limit must be from 1 to 50.");
  }
  const rows = await sql<ActivityRow[]>`
    WITH public_ranked AS (
      SELECT listing.id, listing.public_id, listing.slug, listing.name,
             row_number() OVER (
               ORDER BY listing.confirmed_total_paise DESC,
                        listing.current_total_reached_at ASC,
                        listing.id ASC
             ) AS rank
      FROM app.listings AS listing
      JOIN app.categories AS category ON category.id = listing.category_id
      WHERE listing.lifecycle_status = 'active'
        AND listing.moderation_status = 'clear'
        AND listing.confirmed_total_paise > 0
        AND listing.destination_url ~ '^https://'
        AND category.is_active = true
    )
    SELECT ledger.entry_type AS "entryType",
           ledger.amount_delta_paise AS "amountDeltaPaise",
           ledger.applied_at AS "appliedAt",
           ranked.rank AS "currentMainRank",
           ranked.public_id AS "listingPublicId",
           ranked.slug AS "listingSlug", ranked.name AS "listingName"
    FROM private.financial_ledger AS ledger
    JOIN public_ranked AS ranked ON ranked.id = ledger.listing_id
    WHERE ledger.amount_delta_paise > 0
      AND ledger.entry_type IN (
        'initial_sponsorship', 'raise', 'refund_restoration',
        'chargeback_restoration'
      )
    ORDER BY ledger.applied_at DESC, ledger.id DESC
    LIMIT ${limit}
  `;
  return rows.map((row) => ({
    amountDeltaPaise: row.amountDeltaPaise.toString(),
    appliedAt: isoTimestamp(row.appliedAt),
    currentMainRank: row.currentMainRank.toString(),
    kind: publicMovementKind(row.entryType),
    listingName: row.listingName,
    listingPublicId: row.listingPublicId,
    listingSlug: row.listingSlug,
  }));
}

export async function listPublicCategories(): Promise<PublicCategory[]> {
  const sql = getSqlClient();
  const rows = await sql<PublicCategory[]>`
    select name, slug, sort_order as "sortOrder"
    from app.categories
    where is_active = true
    order by sort_order asc
  `;
  return rows.map((row) => ({
    name: row.name,
    slug: row.slug,
    sortOrder: row.sortOrder,
  }));
}

/** Minimal allowlisted projection for public, indexable listing URLs only. */
export async function listPublicSitemapEntries(): Promise<
  readonly PublicSitemapEntry[]
> {
  const rows = await getSqlClient()<
    { slug: string; updatedAt: Date | string }[]
  >`
    select listing.slug, listing.updated_at as "updatedAt"
    from app.listings as listing
    join app.categories as category on category.id = listing.category_id
    where listing.lifecycle_status = 'active'
      and listing.moderation_status = 'clear'
      and listing.confirmed_total_paise > 0
      and listing.destination_url ~ '^https://'
      and category.is_active = true
    order by listing.id asc
  `;
  return rows.map((row) => ({
    slug: row.slug,
    updatedAt: isoTimestamp(row.updatedAt),
  }));
}
