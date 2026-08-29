import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import postgres from "postgres";

const databaseUrl =
  process.env.DATABASE_DIRECT_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const parsedDatabaseUrl = new URL(databaseUrl);
const listingCount = Number(process.env.PHASE14_LISTING_COUNT ?? 20_000);
const planRuns = Number(process.env.PHASE14_PLAN_RUNS ?? 25);
const outputPath = path.resolve(
  process.env.PHASE14_PLAN_OUTPUT ??
    "artifacts/phase14-performance/query-plans.json",
);

if (process.env.NODE_ENV === "production") {
  throw new Error("Phase 14 synthetic performance fixtures are local-only.");
}
if (
  !["127.0.0.1", "localhost"].includes(parsedDatabaseUrl.hostname) ||
  parsedDatabaseUrl.port !== "54322"
) {
  throw new Error(
    "Phase 14 query plans may only target local Supabase on port 54322.",
  );
}
assert.ok(listingCount >= 10_000, "Use at least 10,000 synthetic listings.");
assert.ok(planRuns >= 20, "Use at least 20 measured runs per query.");

const sql = postgres(databaseUrl, { max: 1, prepare: false });

function percentile(values, fraction) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
}

function collectIndexes(plan, names = new Set()) {
  if (typeof plan?.["Index Name"] === "string") names.add(plan["Index Name"]);
  for (const child of plan?.Plans ?? []) collectIndexes(child, names);
  return [...names].sort();
}

async function explain(transaction, query) {
  const [row] = await transaction.unsafe(
    `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`,
  );
  const document = row["QUERY PLAN"][0];
  return {
    executionMs: document["Execution Time"],
    indexes: collectIndexes(document.Plan),
    planningMs: document["Planning Time"],
    plan: document,
  };
}

async function benchmark(transaction, name, query) {
  // First run is an explicit warm-up; the recorded runs still execute the
  // complete uncached SQL query but use a warmed local PostgreSQL buffer pool.
  await explain(transaction, query);
  const samples = [];
  let finalPlan;
  for (let run = 0; run < planRuns; run += 1) {
    finalPlan = await explain(transaction, query);
    samples.push(finalPlan.executionMs);
  }
  const result = {
    maximumMs: Math.max(...samples),
    minimumMs: Math.min(...samples),
    p50Ms: percentile(samples, 0.5),
    p95Ms: percentile(samples, 0.95),
    planRuns,
    indexes: finalPlan.indexes,
    representativePlan: finalPlan.plan,
  };
  console.log(`${name}: p95=${result.p95Ms.toFixed(3)}ms`);
  return result;
}

try {
  const results = await sql.begin(async (transaction) => {
    await transaction.unsafe(`
      SET LOCAL statement_timeout = '120s';
      SET LOCAL lock_timeout = '5s';

      CREATE TEMP TABLE bench_categories (
        id integer PRIMARY KEY,
        slug text NOT NULL,
        is_active boolean NOT NULL
      ) ON COMMIT DROP;
      CREATE TEMP TABLE bench_listings (
        id integer PRIMARY KEY,
        public_id text NOT NULL UNIQUE,
        slug text NOT NULL UNIQUE,
        category_id integer NOT NULL,
        lifecycle_status text NOT NULL,
        moderation_status text NOT NULL,
        confirmed_total_paise bigint NOT NULL,
        current_total_reached_at timestamptz NOT NULL,
        destination_url text NOT NULL,
        updated_at timestamptz NOT NULL
      ) ON COMMIT DROP;
      CREATE INDEX bench_listings_public_ranking_idx
        ON bench_listings (
          confirmed_total_paise DESC, current_total_reached_at ASC, id ASC
        ) WHERE lifecycle_status = 'active'
          AND moderation_status = 'clear' AND confirmed_total_paise > 0;
      CREATE INDEX bench_listings_public_category_ranking_idx
        ON bench_listings (
          category_id, confirmed_total_paise DESC,
          current_total_reached_at ASC, id ASC
        ) WHERE lifecycle_status = 'active'
          AND moderation_status = 'clear' AND confirmed_total_paise > 0;
      CREATE INDEX bench_listings_admin_queue_updated_idx
        ON bench_listings (updated_at DESC, id)
        WHERE moderation_status IN ('pending_review', 'suspended')
           OR lifecycle_status = 'removed';

      CREATE TEMP TABLE bench_daily (
        listing_id integer NOT NULL,
        business_date date NOT NULL,
        net_amount_paise bigint NOT NULL,
        total_reached_at timestamptz NOT NULL,
        PRIMARY KEY (listing_id, business_date)
      ) ON COMMIT DROP;
      CREATE INDEX bench_daily_ranking_idx ON bench_daily (
        business_date, net_amount_paise DESC, total_reached_at ASC, listing_id
      ) WHERE net_amount_paise > 0;

      CREATE TEMP TABLE bench_owners (
        listing_id integer NOT NULL,
        user_id integer NOT NULL,
        revoked_at timestamptz,
        PRIMARY KEY (listing_id, user_id)
      ) ON COMMIT DROP;
      CREATE INDEX bench_owners_active_user_idx
        ON bench_owners (user_id, listing_id) WHERE revoked_at IS NULL;

      CREATE TEMP TABLE bench_attempts (
        id integer PRIMARY KEY,
        listing_id integer NOT NULL,
        provider text NOT NULL,
        provider_environment text NOT NULL,
        provider_order_id text,
        state text NOT NULL,
        created_at timestamptz NOT NULL
      ) ON COMMIT DROP;
      CREATE UNIQUE INDEX bench_attempts_provider_order_idx ON bench_attempts (
        provider, provider_environment, provider_order_id
      ) WHERE provider_order_id IS NOT NULL;
      CREATE INDEX bench_attempts_listing_created_idx
        ON bench_attempts (listing_id, created_at DESC);

      CREATE TEMP TABLE bench_events (
        id integer PRIMARY KEY,
        provider text NOT NULL,
        provider_environment text NOT NULL,
        provider_event_id text NOT NULL,
        processing_state text NOT NULL,
        received_at timestamptz NOT NULL
      ) ON COMMIT DROP;
      CREATE UNIQUE INDEX bench_events_identity_idx ON bench_events (
        provider, provider_environment, provider_event_id
      );
      CREATE INDEX bench_events_received_idx ON bench_events (received_at, id);

      CREATE TEMP TABLE bench_ledger (
        id integer PRIMARY KEY,
        listing_id integer NOT NULL,
        source_provider text NOT NULL,
        source_environment text NOT NULL,
        source_key text NOT NULL,
        applied_at timestamptz NOT NULL
      ) ON COMMIT DROP;
      CREATE UNIQUE INDEX bench_ledger_source_idx ON bench_ledger (
        source_provider, source_environment, source_key
      );
      CREATE INDEX bench_ledger_listing_applied_idx
        ON bench_ledger (listing_id, applied_at DESC, id DESC);

      CREATE TEMP TABLE bench_outbox (
        id integer PRIMARY KEY,
        state text NOT NULL,
        next_attempt_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL
      ) ON COMMIT DROP;
      CREATE INDEX bench_outbox_worker_idx ON bench_outbox (
        next_attempt_at ASC, created_at ASC, id ASC
      ) WHERE state IN ('pending', 'failed_retryable', 'sending');

      CREATE TEMP TABLE bench_reconciliation (
        id integer PRIMARY KEY,
        state text NOT NULL,
        created_at timestamptz NOT NULL
      ) ON COMMIT DROP;
      CREATE INDEX bench_reconciliation_open_created_idx
        ON bench_reconciliation (created_at DESC, id)
        WHERE state IN ('open', 'investigating');
    `);

    await transaction.unsafe(`
      INSERT INTO bench_categories
      SELECT value, 'category-' || value, true FROM generate_series(1, 20) value;

      INSERT INTO bench_listings
      SELECT value, 'public-' || value, 'listing-' || value,
        1 + (value % 20),
        CASE WHEN value % 50 = 0 THEN 'removed' ELSE 'active' END,
        CASE WHEN value % 40 = 0 THEN 'pending_review' ELSE 'clear' END,
        (100 + (value % 100000)) * 100::bigint,
        now() - (value % 10000) * interval '1 second',
        'https://listing-' || value || '.example.test',
        now() - (value % 50000) * interval '1 second'
      FROM generate_series(1, ${listingCount}) value;

      INSERT INTO bench_daily
      SELECT listing.id, current_date - day.value,
        (100 + ((listing.id + day.value) % 5000)) * 100::bigint,
        now() - ((listing.id + day.value) % 10000) * interval '1 second'
      FROM bench_listings listing CROSS JOIN generate_series(0, 4) day(value);

      INSERT INTO bench_owners
      SELECT id, 1 + (id % 5000), CASE WHEN id % 25 = 0 THEN now() ELSE NULL END
      FROM bench_listings;

      INSERT INTO bench_attempts
      SELECT value, 1 + (value % ${listingCount}), 'dodo', 'test',
        'order-' || value,
        CASE WHEN value % 5 = 0 THEN 'provider_pending' ELSE 'succeeded' END,
        now() - (value % 100000) * interval '1 second'
      FROM generate_series(1, ${listingCount * 3}) value;

      INSERT INTO bench_events
      SELECT value, 'dodo', 'test', 'event-' || value,
        CASE WHEN value % 20 = 0 THEN 'quarantined' ELSE 'processed' END,
        now() - (value % 200000) * interval '1 second'
      FROM generate_series(1, ${listingCount * 5}) value;

      INSERT INTO bench_ledger
      SELECT value, 1 + (value % ${listingCount}), 'dodo', 'test',
        'ledger-source-' || value,
        now() - (value % 200000) * interval '1 second'
      FROM generate_series(1, ${listingCount * 10}) value;

      INSERT INTO bench_outbox
      SELECT value,
        CASE WHEN value % 8 = 0 THEN 'sent' ELSE 'pending' END,
        now() - (value % 10000) * interval '1 second',
        now() - (value % 50000) * interval '1 second'
      FROM generate_series(1, ${listingCount * 2}) value;

      INSERT INTO bench_reconciliation
      SELECT value,
        CASE WHEN value % 4 = 0 THEN 'resolved' ELSE 'open' END,
        now() - (value % 50000) * interval '1 second'
      FROM generate_series(1, ${listingCount}) value;

      ANALYZE bench_categories;
      ANALYZE bench_listings;
      ANALYZE bench_daily;
      ANALYZE bench_owners;
      ANALYZE bench_attempts;
      ANALYZE bench_events;
      ANALYZE bench_ledger;
      ANALYZE bench_outbox;
      ANALYZE bench_reconciliation;
    `);

    const queries = {
      mainBoard: `
        SELECT id, row_number() OVER (
          ORDER BY confirmed_total_paise DESC, current_total_reached_at, id
        ) AS rank
        FROM bench_listings
        WHERE lifecycle_status = 'active' AND moderation_status = 'clear'
          AND confirmed_total_paise > 0 AND destination_url ~ '^https://'
        ORDER BY confirmed_total_paise DESC, current_total_reached_at, id
        LIMIT 26`,
      todayBoard: `
        SELECT daily.listing_id, daily.net_amount_paise
        FROM bench_daily daily
        JOIN bench_listings listing ON listing.id = daily.listing_id
        WHERE daily.business_date = current_date
          AND daily.net_amount_paise > 0
          AND listing.lifecycle_status = 'active'
          AND listing.moderation_status = 'clear'
        ORDER BY daily.net_amount_paise DESC, daily.total_reached_at,
                 daily.listing_id
        LIMIT 26`,
      categoryBoard: `
        SELECT id FROM bench_listings
        WHERE category_id = 7 AND lifecycle_status = 'active'
          AND moderation_status = 'clear' AND confirmed_total_paise > 0
        ORDER BY confirmed_total_paise DESC, current_total_reached_at, id
        LIMIT 26`,
      ownerRead: `
        SELECT listing.* FROM bench_owners owner
        JOIN bench_listings listing ON listing.id = owner.listing_id
        WHERE owner.user_id = 1729 AND owner.revoked_at IS NULL
        ORDER BY listing.id LIMIT 50`,
      adminQueue: `
        SELECT id, public_id FROM bench_listings
        WHERE moderation_status IN ('pending_review', 'suspended')
           OR lifecycle_status = 'removed'
        ORDER BY updated_at DESC, id LIMIT 100`,
      paymentRead: `
        SELECT * FROM bench_attempts
        WHERE provider = 'dodo' AND provider_environment = 'test'
          AND provider_order_id = 'order-${listingCount}'`,
      webhookEvent: `
        SELECT * FROM bench_events
        WHERE provider = 'dodo' AND provider_environment = 'test'
          AND provider_event_id = 'event-${listingCount}'`,
      emailOutbox: `
        SELECT * FROM bench_outbox
        WHERE state IN ('pending', 'failed_retryable', 'sending')
          AND next_attempt_at <= now()
        ORDER BY next_attempt_at, created_at, id LIMIT 25`,
      reconciliation: `
        SELECT * FROM bench_reconciliation
        WHERE state IN ('open', 'investigating')
        ORDER BY created_at DESC, id LIMIT 50`,
      listingLedger: `
        SELECT * FROM bench_ledger WHERE listing_id = 1729
        ORDER BY applied_at DESC, id DESC LIMIT 50`,
    };

    const benchmarks = {};
    for (const [name, query] of Object.entries(queries)) {
      benchmarks[name] = await benchmark(transaction, name, query);
    }
    return benchmarks;
  });

  const evidence = {
    benchmarks: results,
    dataset: {
      categories: 20,
      emailOutboxRows: listingCount * 2,
      financialLedgerRows: listingCount * 10,
      listings: listingCount,
      listingDailyRows: listingCount * 5,
      owners: listingCount,
      paymentAttempts: listingCount * 3,
      providerEvents: listingCount * 5,
      reconciliationRows: listingCount,
    },
    generatedAt: new Date().toISOString(),
    method:
      "Strictly local temporary synthetic tables; EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON), one warm-up plus measured runs; no field-data claim.",
    node: process.version,
    planRuns,
  };
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(`Wrote ${outputPath}`);
} finally {
  await sql.end({ timeout: 5 });
}
