import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import postgres from "postgres";

const expectedTables = [
  "app.categories",
  "app.listing_assets",
  "app.listing_click_daily_totals",
  "app.listing_daily_totals",
  "app.listings",
  "private.admin_audit_events",
  "private.admin_users",
  "private.click_dedupe",
  "private.email_outbox",
  "private.financial_ledger",
  "private.listing_change_requests",
  "private.listing_owners",
  "private.listing_screenings",
  "private.moderation_actions",
  "private.operational_flags",
  "private.payment_attempts",
  "private.pending_listing_owners",
  "private.provider_adjustments",
  "private.provider_events",
  "private.provider_payments",
  "private.rate_limit_buckets",
  "private.reconciliation_items",
  "private.reconciliation_runs",
  "private.reports",
].sort();

const expectedCategories = [
  ["people-creators", "People & Creators", 1],
  ["tech-apps", "Tech & Apps", 2],
  ["brands-d2c", "Brands & D2C", 3],
  ["b2b-services", "B2B & Services", 4],
  ["media-entertainment", "Media & Entertainment", 5],
  ["other", "Other", 6],
];

const config = await readFile("supabase/config.toml", "utf8");
assert.match(config, /schemas = \["public", "graphql_public"\]/);
assert.match(config, /auto_expose_new_tables = false/);
assert.doesNotMatch(config, /schemas = \[[^\]]*"(?:app|private)"/);

const databaseUrl =
  process.env.DATABASE_DIRECT_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const sql = postgres(databaseUrl, {
  max: 1,
  prepare: false,
  types: { bigint: postgres.BigInt },
});

try {
  const tables = await sql`
    select table_schema || '.' || table_name as qualified_name
    from information_schema.tables
    where table_schema in ('app', 'private')
      and table_type = 'BASE TABLE'
    order by qualified_name
  `;
  assert.deepEqual(
    tables.map((row) => row.qualified_name),
    expectedTables,
  );

  const categories = await sql`
    select slug, name, sort_order
    from app.categories
    order by sort_order
  `;
  assert.deepEqual(
    categories.map((row) => [row.slug, row.name, row.sort_order]),
    expectedCategories,
  );

  const protections = await sql`
    select distinct
           event_object_schema || '.' || event_object_table as table_name,
           trigger_name
    from information_schema.triggers
    where trigger_name in (
      'financial_ledger_append_only',
      'moderation_actions_append_only',
      'admin_audit_events_append_only',
      'listing_screenings_append_only',
      'listings_original_sponsorship_immutable',
      'payment_attempts_intent_immutable'
    )
    order by trigger_name
  `;
  assert.equal(protections.length, 6);

  const unsafeFunctions = await sql`
    select p.oid::regprocedure::text as function_name
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('app', 'private')
      and p.prosecdef
  `;
  assert.equal(unsafeFunctions.length, 0);

  const privilegeRows = await sql`
    select
      has_schema_privilege('anon', 'app', 'USAGE') as anon_app_usage,
      has_schema_privilege('authenticated', 'private', 'USAGE') as authenticated_private_usage,
      has_table_privilege('goneviral_app', 'app.categories', 'SELECT') as app_category_select,
      has_table_privilege('goneviral_app', 'private.financial_ledger', 'INSERT') as app_ledger_insert,
      has_table_privilege('goneviral_app', 'private.financial_ledger', 'UPDATE') as app_ledger_update,
      has_table_privilege('goneviral_app', 'private.admin_audit_events', 'DELETE') as app_audit_delete
  `;
  assert.deepEqual(privilegeRows[0], {
    anon_app_usage: false,
    authenticated_private_usage: false,
    app_category_select: true,
    app_ledger_insert: true,
    app_ledger_update: false,
    app_audit_delete: false,
  });

  const publicPrivileges = await sql`
    select n.nspname as object_name, privilege_type
    from pg_namespace n
    cross join lateral aclexplode(
      coalesce(n.nspacl, acldefault('n', n.nspowner))
    ) privileges
    where n.nspname in ('app', 'private')
      and privileges.grantee = 0
    union all
    select n.nspname || '.' || c.relname as object_name, privilege_type
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    cross join lateral aclexplode(
      coalesce(c.relacl, acldefault('r', c.relowner))
    ) privileges
    where n.nspname in ('app', 'private')
      and c.relkind in ('r', 'p', 'v', 'm', 'S', 'f')
      and privileges.grantee = 0
  `;
  assert.equal(publicPrivileges.length, 0);

  console.log(
    `Schema verification passed: ${expectedTables.length} private/domain tables, six canonical categories, no SECURITY DEFINER functions, and no PUBLIC/browser-role access.`,
  );
} finally {
  await sql.end({ timeout: 5 });
}
