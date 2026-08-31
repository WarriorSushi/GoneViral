import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { readPublicEnv } from "@/config/env/public";

import { getDatabase } from "../../client";
import { getSqlClient } from "../../client";
import { listingOwners } from "../../schema";

export async function findActiveListingOwner(
  listingId: string,
  userId: string,
) {
  const [owner] = await getDatabase()
    .select()
    .from(listingOwners)
    .where(
      and(
        eq(listingOwners.listingId, listingId),
        eq(listingOwners.userId, userId),
        isNull(listingOwners.revokedAt),
      ),
    )
    .limit(1);

  return owner ?? null;
}

export type OwnerListingSummary = Readonly<{
  confirmedTotalPaise: string;
  lifecycleStatus: string;
  moderationStatus: string;
  name: string;
  rank: number | null;
  slug: string;
  todayTotalPaise: string;
}>;

export type OwnerListingDetail = OwnerListingSummary &
  Readonly<{
    categoryName: string;
    categorySlug: string;
    destinationHost: string;
    destinationUrl: string;
    logoUrl: string | null;
    originalSponsorshipPaise: string;
    tagline: string;
  }>;

export type OwnerPaymentHistoryItem = Readonly<{
  amountDeltaPaise: string;
  appliedAt: string;
  entryType: string;
}>;

type OwnerListingRow = {
  category_name?: string;
  category_slug?: string;
  confirmed_total_paise: bigint;
  destination_host?: string;
  destination_url?: string;
  lifecycle_status: string;
  logo_public_bucket?: string | null;
  logo_public_object_key?: string | null;
  moderation_status: string;
  name: string;
  original_sponsorship_paise?: bigint;
  rank: bigint | null;
  slug: string;
  tagline?: string;
  today_total_paise: bigint;
};

function summary(row: OwnerListingRow): OwnerListingSummary {
  return {
    confirmedTotalPaise: row.confirmed_total_paise.toString(),
    lifecycleStatus: row.lifecycle_status,
    moderationStatus: row.moderation_status,
    name: row.name,
    rank: row.rank === null ? null : Number(row.rank),
    slug: row.slug,
    todayTotalPaise: row.today_total_paise.toString(),
  };
}

export async function listOwnedListings(
  userId: string,
): Promise<readonly OwnerListingSummary[]> {
  const rows = await getSqlClient()<OwnerListingRow[]>`
    WITH ranked AS (
      SELECT id,
        row_number() OVER (
          ORDER BY confirmed_total_paise DESC,
                   current_total_reached_at ASC NULLS LAST, id ASC
        ) AS rank
      FROM app.listings
      WHERE lifecycle_status = 'active'
        AND moderation_status <> 'suspended'
    )
    SELECT listing.name, listing.slug, listing.lifecycle_status,
           listing.moderation_status, listing.confirmed_total_paise,
           ranked.rank,
           coalesce(today.net_amount_paise, 0) AS today_total_paise
    FROM private.listing_owners AS ownership
    JOIN app.listings AS listing ON listing.id = ownership.listing_id
    LEFT JOIN ranked ON ranked.id = listing.id
    LEFT JOIN app.listing_daily_totals AS today
      ON today.listing_id = listing.id
     AND today.business_date = (now() AT TIME ZONE 'Asia/Kolkata')::date
    WHERE ownership.user_id = ${userId}
      AND ownership.revoked_at IS NULL
    ORDER BY listing.created_at DESC, listing.id
  `;
  return rows.map(summary);
}

export async function requireOwnerListingBySlug(
  slug: string,
  userId: string,
): Promise<OwnerListingDetail | null> {
  const rows = await getSqlClient()<OwnerListingRow[]>`
    WITH ranked AS (
      SELECT id,
        row_number() OVER (
          ORDER BY confirmed_total_paise DESC,
                   current_total_reached_at ASC NULLS LAST, id ASC
        ) AS rank
      FROM app.listings
      WHERE lifecycle_status = 'active'
        AND moderation_status <> 'suspended'
    )
    SELECT listing.name, listing.slug, listing.tagline,
           listing.destination_url, listing.destination_host,
           category.name AS category_name, category.slug AS category_slug,
           asset.public_bucket AS logo_public_bucket,
           asset.public_object_key AS logo_public_object_key,
           listing.lifecycle_status, listing.moderation_status,
           listing.confirmed_total_paise,
           listing.original_sponsorship_paise, ranked.rank,
           coalesce(today.net_amount_paise, 0) AS today_total_paise
    FROM app.listings AS listing
    JOIN private.listing_owners AS ownership
      ON ownership.listing_id = listing.id
     AND ownership.user_id = ${userId}
     AND ownership.revoked_at IS NULL
    JOIN app.categories AS category ON category.id = listing.category_id
    LEFT JOIN app.listing_assets AS asset
      ON asset.id = listing.logo_asset_id AND asset.listing_id = listing.id
     AND asset.state = 'ready'
    LEFT JOIN ranked ON ranked.id = listing.id
    LEFT JOIN app.listing_daily_totals AS today
      ON today.listing_id = listing.id
     AND today.business_date = (now() AT TIME ZONE 'Asia/Kolkata')::date
    WHERE listing.slug = ${slug}
    LIMIT 1
  `;
  const row = rows[0];
  if (
    !row ||
    row.category_name === undefined ||
    row.category_slug === undefined ||
    row.destination_host === undefined ||
    row.destination_url === undefined ||
    row.original_sponsorship_paise === undefined ||
    row.tagline === undefined
  ) {
    return null;
  }
  const publicSupabaseUrl = readPublicEnv().NEXT_PUBLIC_SUPABASE_URL?.replace(
    /\/$/,
    "",
  );
  return {
    ...summary(row),
    categoryName: row.category_name,
    categorySlug: row.category_slug,
    destinationHost: row.destination_host,
    destinationUrl: row.destination_url,
    logoUrl:
      row.logo_public_bucket && row.logo_public_object_key && publicSupabaseUrl
        ? `${publicSupabaseUrl}/storage/v1/object/public/${encodeURIComponent(row.logo_public_bucket)}/${row.logo_public_object_key.split("/").map(encodeURIComponent).join("/")}`
        : null,
    originalSponsorshipPaise: row.original_sponsorship_paise.toString(),
    tagline: row.tagline,
  };
}

export type OwnerPendingChange = Readonly<{
  changeType: string;
  createdAt: string;
}>;

export async function listOwnerPendingChanges(
  slug: string,
  userId: string,
): Promise<readonly OwnerPendingChange[]> {
  const rows = await getSqlClient()<
    { change_type: string; created_at: Date | string }[]
  >`
    SELECT request.change_type, request.created_at
    FROM private.listing_change_requests AS request
    JOIN app.listings AS listing ON listing.id = request.listing_id
    JOIN private.listing_owners AS ownership
      ON ownership.listing_id = listing.id
     AND ownership.user_id = ${userId} AND ownership.revoked_at IS NULL
    WHERE listing.slug = ${slug} AND request.state = 'pending'
    ORDER BY request.created_at DESC, request.id DESC
  `;
  return rows.map((row) => ({
    changeType: row.change_type,
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

export async function listOwnerPaymentHistory(
  slug: string,
  userId: string,
): Promise<readonly OwnerPaymentHistoryItem[]> {
  const rows = await getSqlClient()<
    {
      amount_delta_paise: bigint;
      applied_at: Date | string;
      entry_type: string;
    }[]
  >`
    SELECT ledger.entry_type, ledger.amount_delta_paise, ledger.applied_at
    FROM private.financial_ledger AS ledger
    JOIN app.listings AS listing ON listing.id = ledger.listing_id
    JOIN private.listing_owners AS ownership
      ON ownership.listing_id = ledger.listing_id
     AND ownership.user_id = ${userId}
     AND ownership.revoked_at IS NULL
    WHERE listing.slug = ${slug}
    ORDER BY ledger.applied_at DESC, ledger.id DESC
  `;
  return rows.map((row) => ({
    amountDeltaPaise: row.amount_delta_paise.toString(),
    appliedAt: new Date(row.applied_at).toISOString(),
    entryType: row.entry_type,
  }));
}

export type OwnerRaiseAttemptStatus = Readonly<{
  amountPaise: string;
  estimatedRank: number | null;
  listingName: string;
  mainRank: number | null;
  state: "confirmed" | "failed" | "pending" | "reversed";
}>;

export async function getOwnerRaiseAttemptStatus(
  publicId: string,
  slug: string,
  userId: string,
): Promise<OwnerRaiseAttemptStatus | null> {
  if (!/^att_[A-Za-z0-9_-]{24}$/.test(publicId)) return null;
  const rows = await getSqlClient()<
    {
      amount_paise: bigint;
      estimated_rank: bigint | null;
      listing_name: string;
      main_rank: bigint | null;
      net_amount_paise: bigint;
      state: string;
    }[]
  >`
    WITH ranked AS (
      SELECT id, row_number() OVER (
        ORDER BY confirmed_total_paise DESC, current_total_reached_at ASC, id ASC
      ) AS main_rank
      FROM app.listings
      WHERE lifecycle_status = 'active' AND moderation_status = 'clear'
        AND confirmed_total_paise > 0
    )
    SELECT attempt.amount_paise, attempt.estimated_rank_snapshot AS estimated_rank,
           listing.name AS listing_name, attempt.state, ranked.main_rank,
           COALESCE((
             SELECT sum(ledger.amount_delta_paise)
             FROM private.financial_ledger AS ledger
             WHERE ledger.payment_attempt_id = attempt.id
           ), 0)::bigint AS net_amount_paise
    FROM private.payment_attempts AS attempt
    JOIN app.listings AS listing ON listing.id = attempt.listing_id
    JOIN private.listing_owners AS ownership
      ON ownership.listing_id = attempt.listing_id
     AND ownership.user_id = ${userId} AND ownership.revoked_at IS NULL
    LEFT JOIN ranked ON ranked.id = listing.id
    WHERE attempt.public_id = ${publicId} AND attempt.purpose = 'raise'
      AND listing.slug = ${slug}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    amountPaise: row.amount_paise.toString(),
    estimatedRank:
      row.estimated_rank === null ? null : Number(row.estimated_rank),
    listingName: row.listing_name,
    mainRank: row.main_rank === null ? null : Number(row.main_rank),
    state:
      row.state === "succeeded"
        ? row.net_amount_paise <= 0n
          ? "reversed"
          : "confirmed"
        : ["failed", "cancelled", "expired", "dropped", "quarantined"].includes(
              row.state,
            )
          ? "failed"
          : "pending",
  };
}

export async function recordOwnerRaiseReturn(
  publicId: string,
  slug: string,
  userId: string,
) {
  const rows = await getSqlClient()<{ public_id: string }[]>`
    UPDATE private.payment_attempts AS attempt
    SET state = 'customer_returned', updated_at = now()
    FROM app.listings AS listing, private.listing_owners AS ownership
    WHERE attempt.public_id = ${publicId} AND attempt.purpose = 'raise'
      AND attempt.state = 'checkout_ready' AND listing.id = attempt.listing_id
      AND listing.slug = ${slug} AND ownership.listing_id = listing.id
      AND ownership.user_id = ${userId} AND ownership.revoked_at IS NULL
    RETURNING attempt.public_id
  `;
  if (rows[0]) return true;

  // The authoritative webhook can settle before the browser returns from
  // Dodo. In that race, the attempt is already succeeded and must remain so;
  // an authenticated owner should still reach the status page.
  return Boolean(await getOwnerRaiseAttemptStatus(publicId, slug, userId));
}
