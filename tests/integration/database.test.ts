import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";

import { databaseSchema, listings } from "@/server/db/schema";

const directDatabaseUrl =
  process.env.DATABASE_DIRECT_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const runtimeDatabaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres.pooler-dev:postgres@127.0.0.1:54329/postgres";

const directSql = postgres(directDatabaseUrl, {
  max: 2,
  prepare: false,
  types: { bigint: postgres.BigInt },
});
const runtimeSql = postgres(runtimeDatabaseUrl, {
  max: 2,
  prepare: false,
  types: { bigint: postgres.BigInt },
});
const runtimeDatabase = drizzle(runtimeSql, { schema: databaseSchema });

const migrationSql = readFileSync(
  path.resolve(
    "supabase",
    "migrations",
    "20260828144813_phase_2_database_foundation.sql",
  ),
  "utf8",
);
const categorySeedSql = migrationSql.match(
  /INSERT INTO "app"\."categories"[\s\S]*?\n  END;/,
)?.[0];

if (!categorySeedSql) {
  throw new Error(
    "Canonical category seed SQL was not found in the migration.",
  );
}

type DatabaseTransaction = postgres.TransactionSql<{ bigint: bigint }>;

const rollbackSentinel = new Error("ROLLBACK_TEST_TRANSACTION");

async function inRollbackTransaction(
  sqlClient: postgres.Sql<{ bigint: bigint }>,
  work: (transaction: DatabaseTransaction) => Promise<void>,
): Promise<void> {
  try {
    await sqlClient.begin(async (transaction) => {
      await work(transaction);
      throw rollbackSentinel;
    });
  } catch (error) {
    if (error !== rollbackSentinel) {
      throw error;
    }
  }
}

function postgresErrorCode(error: unknown): string | undefined {
  return error instanceof postgres.PostgresError ? error.code : undefined;
}

async function expectDatabaseError(
  transaction: DatabaseTransaction,
  expectedCode: string,
  operation: (savepoint: DatabaseTransaction) => Promise<unknown>,
): Promise<void> {
  let capturedError: unknown;

  try {
    await transaction.savepoint(async (savepoint) => operation(savepoint));
  } catch (error) {
    capturedError = error;
  }

  expect(postgresErrorCode(capturedError)).toBe(expectedCode);
}

async function insertDraftListing(
  transaction: DatabaseTransaction,
  suffix = randomUUID(),
): Promise<string> {
  const [listing] = await transaction<{ id: string }[]>`
    insert into app.listings (
      public_id,
      slug,
      name,
      name_normalized,
      tagline,
      destination_url,
      destination_canonical_key,
      destination_host,
      category_id,
      lifecycle_status,
      moderation_status
    ) values (
      ${`public-${suffix}`},
      ${`listing-${suffix}`},
      'Synthetic integration listing',
      'synthetic integration listing',
      'Database test only',
      ${`https://${suffix}.example.test`},
      ${`example.test/${suffix}`},
      ${`${suffix}.example.test`},
      '00000000-0000-4000-8000-000000000002',
      'draft',
      'unreviewed'
    )
    returning id
  `;

  expect(listing).toBeDefined();
  return listing!.id;
}

async function insertInitialAttempt(
  transaction: DatabaseTransaction,
  listingId: string,
): Promise<string> {
  const suffix = randomUUID();
  const [pendingOwner] = await transaction<{ id: string }[]>`
    insert into private.pending_listing_owners (
      listing_id,
      canonical_email,
      email_hash,
      claim_state
    ) values (
      ${listingId},
      ${`${suffix}@example.test`},
      ${`hmac-${suffix}`},
      'pending'
    )
    returning id
  `;
  expect(pendingOwner).toBeDefined();

  const [attempt] = await transaction<{ id: string }[]>`
    insert into private.payment_attempts (
      public_id,
      application_idempotency_key,
      provider,
      provider_environment,
      listing_id,
      purpose,
      state,
      amount_paise,
      currency,
      policy_version,
      minimum_required_paise_snapshot,
      listing_total_paise_snapshot,
      pending_owner_id,
      provider_order_request_hash,
      checkout_expires_at
    ) values (
      ${`attempt-${suffix}`},
      ${`idempotency-${suffix}`},
      'cashfree',
      'sandbox',
      ${listingId},
      'initial_sponsorship',
      'intent_created',
      49900,
      'INR',
      '2026-08-28-v1',
      49900,
      0,
      ${pendingOwner!.id},
      ${`request-hash-${suffix}`},
      transaction_timestamp() + interval '30 minutes'
    )
    returning id
  `;
  expect(attempt).toBeDefined();
  return attempt!.id;
}

afterAll(async () => {
  await Promise.all([
    directSql.end({ timeout: 5 }),
    runtimeSql.end({ timeout: 5 }),
  ]);
});

describe("Phase 2 database constraints", () => {
  it("seeds exactly the six canonical categories idempotently", async () => {
    const before = await directSql`
      select id, slug, name, sort_order, is_active, updated_at
      from app.categories
      order by sort_order
    `;
    expect(before.map((row) => [row.slug, row.name, row.sort_order])).toEqual([
      ["people-creators", "People & Creators", 1],
      ["tech-apps", "Tech & Apps", 2],
      ["brands-d2c", "Brands & D2C", 3],
      ["b2b-services", "B2B & Services", 4],
      ["media-entertainment", "Media & Entertainment", 5],
      ["other", "Other", 6],
    ]);

    await directSql.unsafe(categorySeedSql);

    const after = await directSql`
      select id, slug, name, sort_order, is_active, updated_at
      from app.categories
      order by sort_order
    `;
    expect(after).toEqual(before);
  });

  it("rejects negative, non-whole-rupee and invalid listing states", async () => {
    await inRollbackTransaction(directSql, async (transaction) => {
      const suffix = randomUUID();
      await expectDatabaseError(
        transaction,
        "23514",
        (savepoint) =>
          savepoint`
          insert into app.listings (
            public_id, slug, name, name_normalized, tagline,
            destination_url, destination_canonical_key, destination_host,
            category_id, lifecycle_status, moderation_status,
            confirmed_total_paise
          ) values (
            ${`invalid-public-${randomUUID()}`},
            ${`invalid-${randomUUID()}`},
            'Invalid test row',
            'invalid test row',
            'Must roll back',
            ${`https://${suffix}.example.test`},
            ${`invalid/${randomUUID()}`},
            ${`${suffix}.example.test`},
            '00000000-0000-4000-8000-000000000002',
            'draft',
            'unreviewed',
            -100
          )
        `,
      );
      await expectDatabaseError(
        transaction,
        "23514",
        (savepoint) =>
          savepoint`
          insert into app.listings (
            public_id, slug, name, name_normalized, tagline,
            destination_url, destination_canonical_key, destination_host,
            category_id, lifecycle_status, moderation_status,
            confirmed_total_paise
          ) values (
            ${`invalid-public-${randomUUID()}`},
            ${`invalid-${randomUUID()}`},
            'Invalid test row',
            'invalid test row',
            'Must roll back',
            'https://nonwhole.example.test',
            ${`invalid/${randomUUID()}`},
            'nonwhole.example.test',
            '00000000-0000-4000-8000-000000000002',
            'draft',
            'unreviewed',
            50
          )
        `,
      );
      await expectDatabaseError(
        transaction,
        "23514",
        (savepoint) =>
          savepoint`
          insert into app.listings (
            public_id, slug, name, name_normalized, tagline,
            destination_url, destination_canonical_key, destination_host,
            category_id, lifecycle_status, moderation_status
          ) values (
            ${`invalid-public-${randomUUID()}`},
            ${`invalid-${randomUUID()}`},
            'Invalid test row',
            'invalid test row',
            'Must roll back',
            'https://state.example.test',
            ${`invalid/${randomUUID()}`},
            'state.example.test',
            '00000000-0000-4000-8000-000000000002',
            'invented_state',
            'unreviewed'
          )
        `,
      );
    });
  });

  it("enforces canonical destination and provider identities", async () => {
    await inRollbackTransaction(directSql, async (transaction) => {
      const listingId = await insertDraftListing(transaction);

      await expectDatabaseError(
        transaction,
        "23505",
        (savepoint) =>
          savepoint`
          insert into app.listings (
            public_id, slug, name, name_normalized, tagline,
            destination_url, destination_canonical_key, destination_host,
            category_id, lifecycle_status, moderation_status
          )
          select
            ${`duplicate-${randomUUID()}`},
            ${`duplicate-${randomUUID()}`},
            name,
            name_normalized,
            tagline,
            destination_url,
            destination_canonical_key,
            destination_host,
            category_id,
            lifecycle_status,
            moderation_status
          from app.listings
          where id = ${listingId}
        `,
      );

      const eventId = `event-${randomUUID()}`;
      await transaction`
        insert into private.provider_events (
          provider, provider_environment, provider_event_id,
          provider_event_type, signature_status, raw_body_digest,
          processing_state
        ) values (
          'cashfree', 'sandbox', ${eventId}, 'PAYMENT_SUCCESS',
          'verified', ${`digest-${randomUUID()}`}, 'received'
        )
      `;
      await expectDatabaseError(
        transaction,
        "23505",
        (savepoint) =>
          savepoint`
          insert into private.provider_events (
            provider, provider_environment, provider_event_id,
            provider_event_type, signature_status, raw_body_digest,
            processing_state
          ) values (
            'cashfree', 'sandbox', ${eventId}, 'PAYMENT_SUCCESS',
            'verified', ${`digest-${randomUUID()}`}, 'received'
          )
        `,
      );

      const paymentId = `payment-${randomUUID()}`;
      await transaction`
        insert into private.provider_payments (
          provider, provider_environment, provider_payment_id,
          provider_order_id, amount_paise, currency, status
        ) values (
          'cashfree', 'sandbox', ${paymentId}, ${`order-${randomUUID()}`},
          49900, 'INR', 'SUCCESS'
        )
      `;
      await expectDatabaseError(
        transaction,
        "23505",
        (savepoint) =>
          savepoint`
          insert into private.provider_payments (
            provider, provider_environment, provider_payment_id,
            provider_order_id, amount_paise, currency, status
          ) values (
            'cashfree', 'sandbox', ${paymentId}, ${`order-${randomUUID()}`},
            49900, 'INR', 'SUCCESS'
          )
        `,
      );

      const adjustmentId = `adjustment-${randomUUID()}`;
      await transaction`
        insert into private.provider_adjustments (
          provider, provider_environment, provider_adjustment_id,
          provider_payment_id, kind, status, amount_paise, currency,
          desired_effective_delta
        ) values (
          'cashfree', 'sandbox', ${adjustmentId}, ${paymentId},
          'refund', 'effective', 49900, 'INR', -49900
        )
      `;
      await expectDatabaseError(
        transaction,
        "23505",
        (savepoint) =>
          savepoint`
          insert into private.provider_adjustments (
            provider, provider_environment, provider_adjustment_id,
            provider_payment_id, kind, status, amount_paise, currency,
            desired_effective_delta
          ) values (
            'cashfree', 'sandbox', ${adjustmentId}, ${paymentId},
            'refund', 'effective', 49900, 'INR', -49900
          )
        `,
      );
    });
  });

  it("allows at most one positive fulfilment per payment attempt", async () => {
    await inRollbackTransaction(directSql, async (transaction) => {
      const listingId = await insertDraftListing(transaction);
      const attemptId = await insertInitialAttempt(transaction, listingId);
      const appliedAt = new Date();

      await transaction`
        insert into private.financial_ledger (
          listing_id, entry_type, amount_delta_paise, currency,
          payment_attempt_id, policy_version, applied_at,
          applied_business_date, source_key
        ) values (
          ${listingId}, 'initial_sponsorship', 49900, 'INR',
          ${attemptId}, '2026-08-28-v1', ${appliedAt},
          (${appliedAt}::timestamptz at time zone 'Asia/Kolkata')::date,
          ${`fulfilment-${randomUUID()}`}
        )
      `;

      await expectDatabaseError(
        transaction,
        "23505",
        (savepoint) =>
          savepoint`
          insert into private.financial_ledger (
            listing_id, entry_type, amount_delta_paise, currency,
            payment_attempt_id, policy_version, applied_at,
            applied_business_date, source_key
          ) values (
            ${listingId}, 'initial_sponsorship', 49900, 'INR',
            ${attemptId}, '2026-08-28-v1', ${appliedAt},
            (${appliedAt}::timestamptz at time zone 'Asia/Kolkata')::date,
            ${`fulfilment-${randomUUID()}`}
          )
        `,
      );
    });
  });

  it("protects immutable financial intent and append-only ledger rows", async () => {
    await inRollbackTransaction(directSql, async (transaction) => {
      const listingId = await insertDraftListing(transaction);
      const attemptId = await insertInitialAttempt(transaction, listingId);
      const appliedAt = new Date();
      const [ledgerEntry] = await transaction<{ id: string }[]>`
        insert into private.financial_ledger (
          listing_id, entry_type, amount_delta_paise, currency,
          policy_version, applied_at, applied_business_date, source_key,
          reason_code
        ) values (
          ${listingId}, 'admin_financial_correction', 100, 'INR',
          '2026-08-28-v1', ${appliedAt},
          (${appliedAt}::timestamptz at time zone 'Asia/Kolkata')::date,
          ${`correction-${randomUUID()}`}, 'integration_test'
        )
        returning id
      `;
      expect(ledgerEntry).toBeDefined();

      await expectDatabaseError(
        transaction,
        "55000",
        (savepoint) =>
          savepoint`
          update private.financial_ledger
          set reason_code = 'changed'
          where id = ${ledgerEntry!.id}
        `,
      );
      await expectDatabaseError(
        transaction,
        "55000",
        (savepoint) =>
          savepoint`
          delete from private.financial_ledger
          where id = ${ledgerEntry!.id}
        `,
      );
      await expectDatabaseError(
        transaction,
        "55000",
        (savepoint) =>
          savepoint`
          update private.payment_attempts
          set amount_paise = 59900
          where id = ${attemptId}
        `,
      );

      const activeSuffix = randomUUID();
      const [activeListing] = await transaction<{ id: string }[]>`
        insert into app.listings (
          public_id, slug, name, name_normalized, tagline,
          destination_url, destination_canonical_key, destination_host,
          category_id, lifecycle_status, moderation_status,
          confirmed_total_paise, original_sponsorship_paise,
          current_total_reached_at, first_confirmed_at
        ) values (
          ${`active-${activeSuffix}`}, ${`active-${activeSuffix}`},
          'Active synthetic listing', 'active synthetic listing',
          'Database test only', ${`https://${activeSuffix}.example.test`},
          ${`active/${activeSuffix}`}, ${`${activeSuffix}.example.test`},
          '00000000-0000-4000-8000-000000000002',
          'active', 'clear', 49900, 49900,
          transaction_timestamp(), transaction_timestamp()
        ) returning id
      `;
      expect(activeListing).toBeDefined();
      await expectDatabaseError(
        transaction,
        "55000",
        (savepoint) =>
          savepoint`
          update app.listings
          set original_sponsorship_paise = 59900
          where id = ${activeListing!.id}
        `,
      );
    });
  });
});

describe("Phase 2 database access model", () => {
  it("allows the ordinary server role only intended operations", async () => {
    await inRollbackTransaction(directSql, async (transaction) => {
      await transaction`set local role goneviral_app`;
      const categories = await transaction`select slug from app.categories`;
      expect(categories).toHaveLength(6);
      await insertDraftListing(transaction);
    });
  });

  it.each(["anon", "authenticated"])(
    "blocks the %s role from domain tables",
    async (role) => {
      let capturedError: unknown;
      try {
        await directSql.begin(async (transaction) => {
          if (role === "anon") {
            await transaction`set local role anon`;
          } else {
            await transaction`set local role authenticated`;
          }
          await transaction`select * from app.categories`;
        });
      } catch (error) {
        capturedError = error;
      }
      expect(postgresErrorCode(capturedError)).toBe("42501");
    },
  );

  it("denies ledger and audit mutation privileges to the application role", async () => {
    for (const statement of [
      "update private.financial_ledger set reason_code = reason_code where false",
      "delete from private.financial_ledger where false",
      "update private.admin_audit_events set reason = reason where false",
      "delete from private.admin_audit_events where false",
    ]) {
      let capturedError: unknown;
      try {
        await directSql.begin(async (transaction) => {
          await transaction`set local role goneviral_app`;
          await transaction.unsafe(statement);
        });
      } catch (error) {
        capturedError = error;
      }
      expect(postgresErrorCode(capturedError)).toBe("42501");
    }
  });
});

describe("Phase 2 bigint driver boundary", () => {
  it("maps PostgreSQL bigint to JavaScript bigint through postgres.js and Drizzle", async () => {
    const maximumWholeRupeeBigintPaise = 9_223_372_036_854_775_800n;
    let selectedType: string | undefined;
    let selectedValue: bigint | undefined;

    try {
      await runtimeDatabase.transaction(async (transaction) => {
        const suffix = randomUUID();
        const [inserted] = await transaction
          .insert(listings)
          .values({
            publicId: `bigint-${suffix}`,
            slug: `bigint-${suffix}`,
            name: "Bigint boundary test",
            nameNormalized: "bigint boundary test",
            tagline: "Database test only",
            destinationUrl: `https://${suffix}.example.test`,
            destinationCanonicalKey: `bigint/${suffix}`,
            destinationHost: `${suffix}.example.test`,
            categoryId: "00000000-0000-4000-8000-000000000002",
            lifecycleStatus: "active",
            moderationStatus: "clear",
            confirmedTotalPaise: maximumWholeRupeeBigintPaise,
            originalSponsorshipPaise: 49_900n,
            currentTotalReachedAt: new Date(),
            firstConfirmedAt: new Date(),
          })
          .returning({ id: listings.id });
        expect(inserted).toBeDefined();

        const [selected] = await transaction
          .select({ confirmedTotalPaise: listings.confirmedTotalPaise })
          .from(listings)
          .where(eq(listings.id, inserted!.id));
        expect(selected).toBeDefined();
        selectedType = typeof selected!.confirmedTotalPaise;
        selectedValue = selected!.confirmedTotalPaise;
        throw rollbackSentinel;
      });
    } catch (error) {
      if (error !== rollbackSentinel) {
        throw error;
      }
    }

    expect(selectedType).toBe("bigint");
    expect(selectedValue).toBe(maximumWholeRupeeBigintPaise);
  });
});
