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
process.env.SUBMISSION_HMAC_SECRET ??= "phase6-integration-hmac-secret";

const directSql = postgres(directDatabaseUrl, {
  max: 2,
  prepare: false,
  types: { bigint: postgres.BigInt },
});

async function cleanupPhase6Fixtures() {
  await directSql.begin(async (transaction) => {
    const listingRows = await transaction<{ id: string }[]>`
      SELECT id FROM app.listings WHERE name = 'Phase 6 owner fixture'
    `;
    const listingIds = listingRows.map((row) => row.id);
    if (listingIds.length > 0) {
      await transaction`
        DELETE FROM private.listing_owners WHERE listing_id = ANY(${listingIds})
      `;
      await transaction`
        UPDATE private.payment_attempts
        SET state = 'failed', fulfilled_ledger_entry_id = NULL,
            succeeded_at = NULL
        WHERE listing_id = ANY(${listingIds})
      `;
      await transaction`ALTER TABLE private.financial_ledger DISABLE TRIGGER financial_ledger_append_only`;
      await transaction`
        DELETE FROM private.financial_ledger WHERE listing_id = ANY(${listingIds})
      `;
      await transaction`ALTER TABLE private.financial_ledger ENABLE TRIGGER financial_ledger_append_only`;
      await transaction`
        UPDATE private.pending_listing_owners
        SET created_from_attempt_id = NULL
        WHERE listing_id = ANY(${listingIds})
      `;
      await transaction`
        DELETE FROM private.payment_attempts WHERE listing_id = ANY(${listingIds})
      `;
      await transaction`
        DELETE FROM private.pending_listing_owners WHERE listing_id = ANY(${listingIds})
      `;
      await transaction`DELETE FROM app.listings WHERE id = ANY(${listingIds})`;
    }
    await transaction`
      DELETE FROM auth.users WHERE email LIKE 'phase6-%@example.test'
    `;
  });
}

async function createVerifiedUser(email: string): Promise<string> {
  const response = await fetch("http://127.0.0.1:54321/auth/v1/signup", {
    body: JSON.stringify({ email, password: `local-${randomUUID()}` }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  if (!response.ok)
    throw new Error(`Local Auth signup failed: ${response.status}`);
  const body = (await response.json()) as { user: { id: string } };
  return body.user.id;
}

async function createPaidPendingOwner(email: string) {
  const suffix = randomUUID();
  const listingRows = await directSql<{ id: string }[]>`
    INSERT INTO app.listings (
      public_id, slug, name, name_normalized, tagline, destination_url,
      destination_canonical_key, destination_host, category_id,
      lifecycle_status, moderation_status, confirmed_total_paise,
      original_sponsorship_paise, current_total_reached_at,
      first_confirmed_at, category_locked_at
    ) VALUES (
      ${`phase6-listing-${suffix}`}, ${`phase6-listing-${suffix}`},
      'Phase 6 owner fixture', 'phase 6 owner fixture', 'Owner claim test',
      ${`https://${suffix}.example.test`}, ${`example.test/${suffix}`},
      ${`${suffix}.example.test`}, '00000000-0000-4000-8000-000000000002',
      'active', 'clear', 49900, 49900, now(), now(), now()
    ) RETURNING id
  `;
  const listingId = listingRows[0]?.id;
  if (!listingId) throw new Error("Listing fixture was not created.");

  const { submissionDigest } =
    await import("@/server/security/submission-security");
  const pendingRows = await directSql<{ id: string }[]>`
    INSERT INTO private.pending_listing_owners (
      listing_id, canonical_email, email_hash, claim_state
    ) VALUES (${listingId}, ${email}, ${submissionDigest(email)}, 'pending')
    RETURNING id
  `;
  const pendingId = pendingRows[0]?.id;
  if (!pendingId) throw new Error("Pending-owner fixture was not created.");
  const attemptRows = await directSql<{ id: string }[]>`
    INSERT INTO private.payment_attempts (
      public_id, application_idempotency_key, provider,
      provider_environment, listing_id, purpose, state, amount_paise,
      currency, policy_version, minimum_required_paise_snapshot,
      listing_total_paise_snapshot, pending_owner_id,
      provider_order_request_hash, checkout_expires_at
    ) VALUES (
      ${`phase6-attempt-${suffix}`}, ${`phase6-key-${suffix}`},
      'test-provider', 'local', ${listingId}, 'initial_sponsorship',
      'checkout_ready', 49900, 'INR', 'phase6-test', 49900, 0,
      ${pendingId}, ${`hash-${suffix}`}, now() + interval '30 minutes'
    ) RETURNING id
  `;
  const attemptId = attemptRows[0]?.id;
  if (!attemptId) throw new Error("Payment-attempt fixture was not created.");
  const ledgerRows = await directSql<{ id: string }[]>`
    INSERT INTO private.financial_ledger (
      listing_id, entry_type, amount_delta_paise, currency,
      payment_attempt_id, policy_version, applied_at,
      applied_business_date, source_key
    ) VALUES (
      ${listingId}, 'initial_sponsorship', 49900, 'INR', ${attemptId},
      'phase6-test', now(), (now() AT TIME ZONE 'Asia/Kolkata')::date,
      ${`phase6-ledger-${suffix}`}
    ) RETURNING id
  `;
  const ledgerId = ledgerRows[0]?.id;
  if (!ledgerId) throw new Error("Ledger fixture was not created.");
  await directSql`
    UPDATE private.payment_attempts
    SET state = 'succeeded', succeeded_at = now(),
        fulfilled_ledger_entry_id = ${ledgerId}
    WHERE id = ${attemptId}
  `;
  await directSql`
    UPDATE private.pending_listing_owners
    SET created_from_attempt_id = ${attemptId}
    WHERE id = ${pendingId}
  `;
  return { listingId, pendingId };
}

beforeAll(async () => {
  await cleanupPhase6Fixtures();
  const health = await fetch("http://127.0.0.1:54321/auth/v1/health");
  if (!health.ok) throw new Error("Local Supabase Auth is required.");
});

afterAll(async () => {
  await cleanupPhase6Fixtures();
  const { closeDatabase } = await import("@/server/db/client");
  await closeDatabase();
  await directSql.end({ timeout: 5 });
});

describe("verified pending-owner claim", () => {
  it("claims the paid sponsorship once for the matching verified email", async () => {
    const email = `phase6-owner-${randomUUID()}@example.test`;
    const userId = await createVerifiedUser(email);
    const fixture = await createPaidPendingOwner(email);
    const { claimPendingListingsForVerifiedUser } =
      await import("@/server/auth/claim-owner");

    await expect(
      claimPendingListingsForVerifiedUser({ email, userId }),
    ).resolves.toEqual([fixture.listingId]);
    await expect(
      claimPendingListingsForVerifiedUser({ email, userId }),
    ).resolves.toEqual([]);

    const [pending] = await directSql`
      SELECT claim_state, claimed_by_user_id
      FROM private.pending_listing_owners WHERE id = ${fixture.pendingId}
    `;
    expect(pending).toMatchObject({
      claim_state: "claimed",
      claimed_by_user_id: userId,
    });
  });

  it("does not claim for a different verified email", async () => {
    const ownerEmail = `phase6-owner-${randomUUID()}@example.test`;
    const wrongEmail = `phase6-wrong-${randomUUID()}@example.test`;
    const wrongUserId = await createVerifiedUser(wrongEmail);
    const fixture = await createPaidPendingOwner(ownerEmail);
    const { claimPendingListingsForVerifiedUser } =
      await import("@/server/auth/claim-owner");

    await expect(
      claimPendingListingsForVerifiedUser({
        email: wrongEmail,
        userId: wrongUserId,
      }),
    ).resolves.toEqual([]);
    const [pending] = await directSql`
      SELECT claim_state FROM private.pending_listing_owners
      WHERE id = ${fixture.pendingId}
    `;
    expect(pending?.claim_state).toBe("pending");
  });

  it("removes owner access immediately after revocation", async () => {
    const email = `phase6-revoked-${randomUUID()}@example.test`;
    const userId = await createVerifiedUser(email);
    const fixture = await createPaidPendingOwner(email);
    const { claimPendingListingsForVerifiedUser } =
      await import("@/server/auth/claim-owner");
    const { findActiveListingOwner, requireOwnerListingBySlug } =
      await import("@/server/db/repositories/private/owners");
    await claimPendingListingsForVerifiedUser({ email, userId });

    expect(
      await findActiveListingOwner(fixture.listingId, userId),
    ).not.toBeNull();
    await directSql`
      UPDATE private.listing_owners SET revoked_at = now()
      WHERE listing_id = ${fixture.listingId} AND user_id = ${userId}
    `;
    expect(await findActiveListingOwner(fixture.listingId, userId)).toBeNull();
    const slugRows = await directSql<{ slug: string }[]>`
      SELECT slug FROM app.listings WHERE id = ${fixture.listingId}
    `;
    const slug = slugRows[0]?.slug;
    if (!slug) throw new Error("Fixture slug was not found.");
    await expect(requireOwnerListingBySlug(slug, userId)).resolves.toBeNull();
  });
});
