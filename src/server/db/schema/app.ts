import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  pgSchema,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const appSchema = pgSchema("app");

const createdAt = () =>
  timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull();

const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull();

export const categories = appSchema.table(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    sortOrder: smallint("sort_order").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("categories_slug_unique").on(table.slug),
    unique("categories_name_unique").on(table.name),
    unique("categories_sort_order_unique").on(table.sortOrder),
    check("categories_sort_order_positive", sql`${table.sortOrder} > 0`),
    check(
      "categories_slug_canonical",
      sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    ),
  ],
);

export const listings = appSchema.table(
  "listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    nameNormalized: text("name_normalized").notNull(),
    tagline: text("tagline").notNull(),
    destinationUrl: text("destination_url").notNull(),
    destinationCanonicalKey: text("destination_canonical_key").notNull(),
    destinationHost: text("destination_host").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    // The circular listing -> selected asset relationship is added explicitly
    // in the reviewed SQL migration after listing_assets exists.
    logoAssetId: uuid("logo_asset_id"),
    lifecycleStatus: text("lifecycle_status").notNull(),
    moderationStatus: text("moderation_status").notNull(),
    confirmedTotalPaise: bigint("confirmed_total_paise", {
      mode: "bigint",
    })
      .default(sql`0`)
      .notNull(),
    originalSponsorshipPaise: bigint("original_sponsorship_paise", {
      mode: "bigint",
    }),
    currentTotalReachedAt: timestamp("current_total_reached_at", {
      withTimezone: true,
      mode: "date",
    }),
    firstConfirmedAt: timestamp("first_confirmed_at", {
      withTimezone: true,
      mode: "date",
    }),
    lastRankChangeAt: timestamp("last_rank_change_at", {
      withTimezone: true,
      mode: "date",
    }),
    categoryLockedAt: timestamp("category_locked_at", {
      withTimezone: true,
      mode: "date",
    }),
    moderationReasonCode: text("moderation_reason_code"),
    removedAt: timestamp("removed_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    version: bigint("version", { mode: "bigint" })
      .default(sql`1`)
      .notNull(),
  },
  (table) => [
    unique("listings_public_id_unique").on(table.publicId),
    unique("listings_slug_unique").on(table.slug),
    unique("listings_destination_canonical_key_unique").on(
      table.destinationCanonicalKey,
    ),
    check(
      "listings_lifecycle_status_valid",
      sql`${table.lifecycleStatus} in ('draft', 'payment_pending', 'active', 'inactive_reversed', 'removed')`,
    ),
    check(
      "listings_moderation_status_valid",
      sql`${table.moderationStatus} in ('unreviewed', 'pending_review', 'clear', 'suspended')`,
    ),
    check("listings_total_nonnegative", sql`${table.confirmedTotalPaise} >= 0`),
    check(
      "listings_total_whole_rupees",
      sql`${table.confirmedTotalPaise} % 100 = 0`,
    ),
    check(
      "listings_original_valid",
      sql`${table.originalSponsorshipPaise} is null or (${table.originalSponsorshipPaise} >= 49900 and ${table.originalSponsorshipPaise} % 100 = 0)`,
    ),
    check(
      "listings_active_financial_state_valid",
      sql`${table.lifecycleStatus} <> 'active' or (${table.originalSponsorshipPaise} is not null and ${table.confirmedTotalPaise} > 0)`,
    ),
    check(
      "listings_inactive_reversed_state_valid",
      sql`${table.lifecycleStatus} <> 'inactive_reversed' or (${table.originalSponsorshipPaise} is not null and ${table.confirmedTotalPaise} = 0)`,
    ),
    check(
      "listings_unconfirmed_state_valid",
      sql`${table.originalSponsorshipPaise} is not null or (${table.confirmedTotalPaise} = 0 and ${table.currentTotalReachedAt} is null and ${table.firstConfirmedAt} is null)`,
    ),
    check("listings_version_positive", sql`${table.version} > 0`),
    check(
      "listings_destination_https",
      sql`${table.destinationUrl} ~ '^https://'`,
    ),
    index("listings_main_ranking_idx").on(
      table.lifecycleStatus,
      table.moderationStatus,
      table.confirmedTotalPaise.desc(),
      table.currentTotalReachedAt.asc(),
      table.id.asc(),
    ),
    index("listings_category_ranking_idx").on(
      table.categoryId,
      table.lifecycleStatus,
      table.moderationStatus,
      table.confirmedTotalPaise.desc(),
      table.currentTotalReachedAt.asc(),
      table.id.asc(),
    ),
    index("listings_public_ranking_idx")
      .on(
        table.confirmedTotalPaise.desc(),
        table.currentTotalReachedAt.asc(),
        table.id.asc(),
      )
      .where(
        sql`${table.lifecycleStatus} = 'active' and ${table.moderationStatus} = 'clear' and ${table.confirmedTotalPaise} > 0`,
      ),
    index("listings_public_category_ranking_idx")
      .on(
        table.categoryId,
        table.confirmedTotalPaise.desc(),
        table.currentTotalReachedAt.asc(),
        table.id.asc(),
      )
      .where(
        sql`${table.lifecycleStatus} = 'active' and ${table.moderationStatus} = 'clear' and ${table.confirmedTotalPaise} > 0`,
      ),
    index("listings_admin_queue_updated_idx")
      .on(table.updatedAt.desc(), table.id)
      .where(
        sql`${table.moderationStatus} in ('pending_review', 'suspended') or ${table.lifecycleStatus} = 'removed'`,
      ),
    index("listings_destination_host_idx").on(table.destinationHost),
    index("listings_logo_asset_idx").on(table.logoAssetId),
    index("listings_created_at_idx").on(table.createdAt.desc()),
  ],
);

export const listingAssets = appSchema.table(
  "listing_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id").references(() => listings.id, {
      onDelete: "restrict",
    }),
    kind: text("kind").notNull(),
    state: text("state").notNull(),
    stagingBucket: text("staging_bucket"),
    stagingObjectKey: text("staging_object_key"),
    publicBucket: text("public_bucket"),
    publicObjectKey: text("public_object_key"),
    contentType: text("content_type"),
    byteSize: bigint("byte_size", { mode: "bigint" }),
    width: integer("width"),
    height: integer("height"),
    sha256: text("sha256"),
    rejectionCode: text("rejection_code"),
    createdAt: createdAt(),
    processedAt: timestamp("processed_at", {
      withTimezone: true,
      mode: "date",
    }),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date",
    }),
  },
  (table) => [
    uniqueIndex("listing_assets_staging_object_key_unique")
      .on(table.stagingObjectKey)
      .where(sql`${table.stagingObjectKey} is not null`),
    uniqueIndex("listing_assets_public_object_key_unique")
      .on(table.publicObjectKey)
      .where(sql`${table.publicObjectKey} is not null`),
    check("listing_assets_kind_valid", sql`${table.kind} = 'logo'`),
    check(
      "listing_assets_state_valid",
      sql`${table.state} in ('staged', 'processing', 'ready', 'rejected', 'orphaned')`,
    ),
    check(
      "listing_assets_byte_size_nonnegative",
      sql`${table.byteSize} is null or ${table.byteSize} >= 0`,
    ),
    check(
      "listing_assets_dimensions_positive",
      sql`(${table.width} is null or ${table.width} > 0) and (${table.height} is null or ${table.height} > 0)`,
    ),
    check(
      "listing_assets_staged_storage_complete",
      sql`${table.state} not in ('staged', 'processing') or (${table.listingId} is not null and ${table.stagingBucket} is not null and ${table.stagingObjectKey} is not null and ${table.expiresAt} is not null)`,
    ),
    check(
      "listing_assets_ready_storage_complete",
      sql`${table.state} <> 'ready' or (${table.listingId} is not null and ${table.publicBucket} = 'goneviral-logo-public' and ${table.publicObjectKey} is not null and ${table.contentType} = 'image/webp' and ${table.byteSize} is not null and ${table.byteSize} > 0 and ${table.width} = 128 and ${table.height} = 128 and ${table.sha256} is not null and ${table.processedAt} is not null)`,
    ),
    check(
      "listing_assets_rejected_has_reason",
      sql`${table.state} <> 'rejected' or ${table.rejectionCode} is not null`,
    ),
    index("listing_assets_listing_created_idx").on(
      table.listingId,
      table.createdAt.desc(),
    ),
    index("listing_assets_expiry_idx").on(table.state, table.expiresAt),
  ],
);

export const listingDailyTotals = appSchema.table(
  "listing_daily_totals",
  {
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "restrict" }),
    businessDate: date("business_date", { mode: "string" }).notNull(),
    netAmountPaise: bigint("net_amount_paise", { mode: "bigint" })
      .default(sql`0`)
      .notNull(),
    totalReachedAt: timestamp("total_reached_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    // The circular daily projection -> ledger relationship is added in SQL.
    lastLedgerEntryId: uuid("last_ledger_entry_id").notNull(),
    updatedAt: updatedAt(),
  },
  (table) => [
    primaryKey({ columns: [table.listingId, table.businessDate] }),
    check(
      "listing_daily_totals_whole_rupees",
      sql`${table.netAmountPaise} % 100 = 0`,
    ),
    index("listing_daily_totals_ranking_idx").on(
      table.businessDate,
      table.netAmountPaise.desc(),
      table.totalReachedAt.asc(),
      table.listingId.asc(),
    ),
    index("listing_daily_totals_last_ledger_idx").on(table.lastLedgerEntryId),
  ],
);

export const listingClickDailyTotals = appSchema.table(
  "listing_click_daily_totals",
  {
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "restrict" }),
    businessDate: date("business_date", { mode: "string" }).notNull(),
    uniqueClicks: bigint("unique_clicks", { mode: "bigint" })
      .default(sql`0`)
      .notNull(),
    updatedAt: updatedAt(),
  },
  (table) => [
    primaryKey({ columns: [table.listingId, table.businessDate] }),
    check(
      "listing_click_daily_totals_nonnegative",
      sql`${table.uniqueClicks} >= 0`,
    ),
  ],
);

export type CategoryRow = typeof categories.$inferSelect;
export type ListingRow = typeof listings.$inferSelect;
