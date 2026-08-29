import { randomUUID } from "node:crypto";

import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { AdminSession } from "@/server/admin/auth";

const directDatabaseUrl =
  process.env.DATABASE_DIRECT_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
process.env.DATABASE_DIRECT_URL ??= directDatabaseUrl;
process.env.DATABASE_URL ??=
  "postgresql://postgres.pooler-dev:postgres@127.0.0.1:54329/postgres";
process.env.DODO_PAYMENTS_ENVIRONMENT = "mock";
process.env.SUBMISSION_HMAC_SECRET ??= "phase10-admin-hmac-secret";
process.env.PRIVATE_DATA_ENCRYPTION_KEY ??=
  "xtMT1+ly4wVTnz5uDGwQk21jGl4/Ro/GV6z9/imDAdg=";

const directSql = postgres(directDatabaseUrl, {
  max: 2,
  prepare: false,
  types: { bigint: postgres.BigInt },
});
const fixtureName = "Phase 10 admin fixture";
const fixtureUsers: string[] = [];

async function createAdmin(role: AdminSession["role"]): Promise<AdminSession> {
  const email = `phase10-${role}-${randomUUID()}@example.test`;
  const response = await fetch("http://127.0.0.1:54321/auth/v1/signup", {
    body: JSON.stringify({ email, password: `local-${randomUUID()}` }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  if (!response.ok)
    throw new Error(`Local Auth signup failed: ${response.status}`);
  const body = (await response.json()) as { user: { id: string } };
  fixtureUsers.push(body.user.id);
  await directSql`
    INSERT INTO private.admin_users (user_id, role, is_active)
    VALUES (${body.user.id}, ${role}, true)
  `;
  return {
    authenticatedAt: new Date(),
    email,
    role,
    userId: body.user.id,
  };
}

async function createListing(input?: {
  lifecycle?: "active" | "draft";
  moderation?: "clear" | "suspended";
}) {
  const suffix = randomUUID();
  const active = (input?.lifecycle ?? "active") === "active";
  const [listing] = await directSql<
    { id: string; public_id: string; slug: string }[]
  >`
    INSERT INTO app.listings (
      public_id, slug, name, name_normalized, tagline, destination_url,
      destination_canonical_key, destination_host, category_id,
      lifecycle_status, moderation_status, confirmed_total_paise,
      original_sponsorship_paise, current_total_reached_at,
      first_confirmed_at, category_locked_at
    ) VALUES (
      ${`phase10-admin-${suffix}`}, ${`phase10-admin-${suffix}`},
      ${fixtureName}, 'phase 10 admin fixture', 'Admin operations test',
      ${`https://admin-${suffix}.example.test`},
      ${`https://admin-${suffix}.example.test`},
      ${`admin-${suffix}.example.test`},
      '00000000-0000-4000-8000-000000000002',
      ${input?.lifecycle ?? "active"}, ${input?.moderation ?? "clear"},
      ${active ? 49_900 : 0}, ${active ? 49_900 : null},
      ${active ? new Date().toISOString() : null},
      ${active ? new Date().toISOString() : null},
      ${active ? new Date().toISOString() : null}
    ) RETURNING id, public_id, slug
  `;
  if (!listing) throw new Error("Phase 10 listing fixture was not created.");
  return listing;
}

function context(session: AdminSession, requestId = randomUUID()) {
  return {
    ipHmac: "phase10-test-ip",
    requestId,
    session,
    userAgentSummary: "phase10-integration-test",
  };
}

async function createProviderPayment(listingId: string) {
  const suffix = randomUUID();
  const [owner] = await directSql<{ id: string }[]>`
    INSERT INTO private.pending_listing_owners (
      listing_id, canonical_email, email_hash, claim_state
    ) VALUES (
      ${listingId}, ${`phase10-${suffix}@example.test`},
      ${`phase10-hash-${suffix}`}, 'pending'
    ) RETURNING id
  `;
  const [attempt] = await directSql<{ id: string }[]>`
    INSERT INTO private.payment_attempts (
      public_id, application_idempotency_key, provider,
      provider_environment, provider_order_id, provider_checkout_session_id,
      listing_id, purpose, state, amount_paise, currency, policy_version,
      minimum_required_paise_snapshot, listing_total_paise_snapshot,
      pending_owner_id, provider_order_request_hash, customer_phone_e164,
      terms_version, privacy_version, refund_policy_version,
      content_policy_version, checkout_expires_at
    ) VALUES (
      ${`phase10-attempt-${suffix}`}, ${`phase10-key-${suffix}`}, 'dodo',
      'mock', ${`phase10-order-${suffix}`}, ${`phase10-session-${suffix}`},
      ${listingId}, 'initial_sponsorship', 'checkout_ready', 49900, 'INR',
      'phase10-test', 49900, 0, ${owner!.id}, ${`hash-${suffix}`},
      '+919876543210', 'phase10-test', 'phase10-test', 'phase10-test',
      'phase10-test',
      now() + interval '1 hour'
    ) RETURNING id
  `;
  await directSql`
    UPDATE private.pending_listing_owners
    SET created_from_attempt_id = ${attempt!.id} WHERE id = ${owner!.id}
  `;
  const paymentId = `phase10-payment-${suffix}`;
  await directSql`
    INSERT INTO private.provider_payments (
      provider, provider_environment, provider_payment_id,
      provider_order_id, payment_attempt_id, amount_paise, currency,
      status, settled_at
    ) VALUES (
      'dodo', 'mock', ${paymentId}, ${`phase10-order-${suffix}`},
      ${attempt!.id}, 49900, 'INR', 'succeeded', now()
    )
  `;
  return paymentId;
}

async function cleanup() {
  const testUsers = await directSql<{ id: string }[]>`
    SELECT id FROM auth.users WHERE email LIKE 'phase10-%@example.test'
  `;
  const testUserIds = testUsers.map((row) => row.id);
  await directSql`
    UPDATE private.operational_flags
    SET value = '{"enabled": false}'::jsonb, updated_by = NULL
    WHERE key IN ('read_only', 'provider_refunds_enabled')
  `;
  await directSql`
    UPDATE private.operational_flags SET updated_by = NULL
    WHERE key = 'payments_enabled'
  `;
  const listings = await directSql<{ id: string }[]>`
    SELECT id FROM app.listings WHERE public_id LIKE 'phase10-admin-%'
  `;
  const ids = listings.map((row) => row.id);
  await directSql`ALTER TABLE private.admin_refund_requests DISABLE TRIGGER admin_refund_requests_append_only`;
  await directSql`DELETE FROM private.admin_refund_requests WHERE provider_payment_id LIKE 'phase10-payment-%'`;
  await directSql`ALTER TABLE private.admin_refund_requests ENABLE TRIGGER admin_refund_requests_append_only`;
  await directSql`ALTER TABLE private.admin_audit_events DISABLE TRIGGER admin_audit_events_append_only`;
  await directSql`DELETE FROM private.admin_audit_events WHERE target_id LIKE 'phase10-%' OR actor_user_id = ANY(${testUserIds}::uuid[])`;
  await directSql`ALTER TABLE private.admin_audit_events ENABLE TRIGGER admin_audit_events_append_only`;
  if (ids.length > 0) {
    await directSql`ALTER TABLE private.moderation_actions DISABLE TRIGGER moderation_actions_append_only`;
    await directSql`DELETE FROM private.moderation_actions WHERE listing_id = ANY(${ids}::uuid[])`;
    await directSql`ALTER TABLE private.moderation_actions ENABLE TRIGGER moderation_actions_append_only`;
    await directSql`DELETE FROM private.reports WHERE listing_id = ANY(${ids}::uuid[])`;
    await directSql`DELETE FROM private.listing_change_requests WHERE listing_id = ANY(${ids}::uuid[])`;
    await directSql`DELETE FROM private.provider_payments WHERE payment_attempt_id IN (SELECT id FROM private.payment_attempts WHERE listing_id = ANY(${ids}::uuid[]))`;
    await directSql`UPDATE private.pending_listing_owners SET created_from_attempt_id = NULL WHERE listing_id = ANY(${ids}::uuid[])`;
    await directSql`DELETE FROM private.payment_attempts WHERE listing_id = ANY(${ids}::uuid[])`;
    await directSql`DELETE FROM private.pending_listing_owners WHERE listing_id = ANY(${ids}::uuid[])`;
    await directSql`DELETE FROM app.listings WHERE id = ANY(${ids}::uuid[])`;
  }
  if (testUserIds.length > 0) {
    await directSql`DELETE FROM private.admin_users WHERE user_id = ANY(${testUserIds}::uuid[])`;
    await directSql`DELETE FROM auth.users WHERE id = ANY(${testUserIds}::uuid[])`;
    fixtureUsers.length = 0;
  }
}

beforeAll(async () => {
  await cleanup();
  const health = await fetch("http://127.0.0.1:54321/auth/v1/health");
  if (!health.ok) throw new Error("Local Supabase Auth is required.");
});

afterAll(async () => {
  await cleanup();
  const { closeDatabase } = await import("@/server/db/client");
  await closeDatabase();
  await directSql.end({ timeout: 5 });
});

describe("admin moderation operations", () => {
  it("enforces roles, hides suspensions, restores eligible rows, and preserves financial history", async () => {
    const reviewer = await createAdmin("reviewer");
    const operations = await createAdmin("operations");
    const listing = await createListing();
    const { moderateListing } = await import("@/server/admin/operations");
    const { getPublicListingDetail } =
      await import("@/server/db/repositories/leaderboards");
    const businessDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
    }).format(new Date());
    expect(
      await getPublicListingDetail({ businessDate, slug: listing.slug }),
    ).not.toBeNull();

    const suspensionId = randomUUID();
    const suspended = await moderateListing({
      action: "suspend",
      context: context(reviewer, suspensionId),
      listingPublicId: listing.public_id,
      publicReason: "Temporarily unavailable during review.",
      reason: "Evidence reviewed in the synthetic Phase 10 test.",
    });
    expect(suspended.kind).toBe("applied");
    expect(
      await moderateListing({
        action: "suspend",
        context: context(reviewer, suspensionId),
        listingPublicId: listing.public_id,
        reason: "Evidence reviewed in the synthetic Phase 10 test.",
      }),
    ).toEqual({ kind: "duplicate" });
    expect(
      await getPublicListingDetail({ businessDate, slug: listing.slug }),
    ).toBeNull();
    await expect(
      moderateListing({
        action: "remove",
        context: context(reviewer),
        listingPublicId: listing.public_id,
        reason: "Reviewer must not be able to remove this listing.",
      }),
    ).rejects.toThrow("admin_permission_denied");
    await expect(
      moderateListing({
        action: "clear",
        context: context(reviewer),
        listingPublicId: listing.public_id,
        reason: "short",
      }),
    ).rejects.toThrow("admin_reason_invalid");

    expect(
      (
        await moderateListing({
          action: "unsuspend",
          context: context(reviewer),
          listingPublicId: listing.public_id,
          reason: "Review completed and eligibility remains positive.",
        })
      ).kind,
    ).toBe("applied");
    expect(
      await getPublicListingDetail({ businessDate, slug: listing.slug }),
    ).not.toBeNull();

    expect(
      (
        await moderateListing({
          action: "remove",
          context: context(operations),
          listingPublicId: listing.public_id,
          reason: "Operations removal with retained financial history.",
        })
      ).kind,
    ).toBe("applied");
    const [state] = await directSql<
      {
        audits: bigint;
        confirmed_total_paise: bigint;
        destination_canonical_key: string;
        lifecycle_status: string;
        moderation: bigint;
      }[]
    >`
      SELECT listing.lifecycle_status, listing.confirmed_total_paise,
             listing.destination_canonical_key,
             (SELECT count(*)::bigint FROM private.moderation_actions
              WHERE listing_id = listing.id) AS moderation,
             (SELECT count(*)::bigint FROM private.admin_audit_events
              WHERE target_id = listing.public_id) AS audits
      FROM app.listings AS listing WHERE listing.id = ${listing.id}
    `;
    expect(state?.lifecycle_status).toBe("removed");
    expect(state?.confirmed_total_paise).toBe(49_900n);
    expect(state?.destination_canonical_key).toContain("example.test");
    expect(state?.moderation).toBe(3n);
    expect(state?.audits).toBe(3n);
    expect(
      await getPublicListingDetail({ businessDate, slug: listing.slug }),
    ).toBeNull();

    await expect(
      directSql`UPDATE private.moderation_actions SET internal_note = 'tampered' WHERE listing_id = ${listing.id}`,
    ).rejects.toBeInstanceOf(postgres.PostgresError);
    await expect(
      directSql`DELETE FROM private.admin_audit_events WHERE target_id = ${listing.public_id}`,
    ).rejects.toBeInstanceOf(postgres.PostgresError);
  });

  it("refuses to unsuspend a listing without positive active eligibility", async () => {
    const reviewer = await createAdmin("reviewer");
    const listing = await createListing({
      lifecycle: "draft",
      moderation: "suspended",
    });
    const { moderateListing } = await import("@/server/admin/operations");
    await expect(
      moderateListing({
        action: "unsuspend",
        context: context(reviewer),
        listingPublicId: listing.public_id,
        reason: "Synthetic ineligible restoration must be rejected.",
      }),
    ).resolves.toEqual({
      kind: "rejected",
      message: "Only a financially active positive listing can be restored.",
    });
  });

  it("approves or rejects pending owner changes with an immutable reason", async () => {
    const reviewer = await createAdmin("reviewer");
    const listing = await createListing();
    const [nameRequest] = await directSql<{ id: string }[]>`
      INSERT INTO private.listing_change_requests (
        listing_id, requested_by_user_id, change_type, old_value,
        proposed_value, state
      ) VALUES (
        ${listing.id}, ${reviewer.userId}, 'name',
        '{"name":"Phase 10 admin fixture"}'::jsonb,
        '{"name":"Phase 10 reviewed name"}'::jsonb, 'pending'
      ) RETURNING id
    `;
    const { reviewChangeRequest } = await import("@/server/admin/operations");
    expect(
      (
        await reviewChangeRequest({
          changeRequestId: nameRequest!.id,
          context: context(reviewer),
          decision: "approved",
          reason: "The proposed name matches the supplied evidence.",
        })
      ).kind,
    ).toBe("applied");
    const [approved] = await directSql<{ name: string; state: string }[]>`
      SELECT listing.name, request.state
      FROM app.listings AS listing
      JOIN private.listing_change_requests AS request
        ON request.listing_id = listing.id
      WHERE request.id = ${nameRequest!.id}
    `;
    expect(approved).toEqual({
      name: "Phase 10 reviewed name",
      state: "approved",
    });

    const [categoryRequest] = await directSql<{ id: string }[]>`
      INSERT INTO private.listing_change_requests (
        listing_id, requested_by_user_id, change_type, old_value,
        proposed_value, state
      ) VALUES (
        ${listing.id}, ${reviewer.userId}, 'category',
        '{"id":"00000000-0000-4000-8000-000000000002"}'::jsonb,
        '{"id":"00000000-0000-4000-8000-000000000003"}'::jsonb,
        'pending'
      ) RETURNING id
    `;
    expect(
      (
        await reviewChangeRequest({
          changeRequestId: categoryRequest!.id,
          context: context(reviewer),
          decision: "rejected",
          reason: "The proposed category does not match the listing.",
        })
      ).kind,
    ).toBe("applied");
    const [rejected] = await directSql<
      { category_id: string; state: string }[]
    >`
      SELECT listing.category_id, request.state
      FROM app.listings AS listing
      JOIN private.listing_change_requests AS request
        ON request.listing_id = listing.id
      WHERE request.id = ${categoryRequest!.id}
    `;
    expect(rejected).toEqual({
      category_id: "00000000-0000-4000-8000-000000000002",
      state: "rejected",
    });
  });
});

describe("emergency operational controls", () => {
  it("allows only super admins to audit read-only and payments-off changes", async () => {
    const operations = await createAdmin("operations");
    const superAdmin = await createAdmin("super_admin");
    const { updateOperationalFlag } = await import("@/server/admin/operations");
    const { mutationsAreReadOnly, paymentsAreEnabled } =
      await import("@/server/operations/flags");

    await expect(
      updateOperationalFlag({
        context: context(operations),
        enabled: true,
        key: "read_only",
        reason: "Operations role must not control emergency flags.",
      }),
    ).rejects.toThrow("admin_permission_denied");

    const readOnlyId = randomUUID();
    expect(
      (
        await updateOperationalFlag({
          context: context(superAdmin, readOnlyId),
          enabled: true,
          key: "read_only",
          reason: "Synthetic incident enables the read-only boundary.",
        })
      ).kind,
    ).toBe("applied");
    const [readOnlyFlag] = await directSql<{ value: unknown }[]>`
      SELECT value FROM private.operational_flags WHERE key = 'read_only'
    `;
    expect(readOnlyFlag?.value).toEqual({ enabled: true });
    const [flagAudit] = await directSql<{ after_snapshot: unknown }[]>`
      SELECT after_snapshot FROM private.admin_audit_events
      WHERE request_id = ${readOnlyId} AND action = 'operational_flag_updated'
    `;
    expect(flagAudit?.after_snapshot).toEqual({ enabled: true });
    expect(await mutationsAreReadOnly()).toBe(true);
    expect(
      (
        await updateOperationalFlag({
          context: context(superAdmin, readOnlyId),
          enabled: true,
          key: "read_only",
          reason: "Synthetic incident enables the read-only boundary.",
        })
      ).kind,
    ).toBe("duplicate");
    await updateOperationalFlag({
      context: context(superAdmin),
      enabled: false,
      key: "read_only",
      reason: "Synthetic incident has been safely resolved.",
    });
    expect(await mutationsAreReadOnly()).toBe(false);

    await updateOperationalFlag({
      context: context(superAdmin),
      enabled: false,
      key: "payments_enabled",
      reason: "Synthetic payment incident pauses new checkouts.",
    });
    expect(await paymentsAreEnabled()).toBe(false);
    await updateOperationalFlag({
      context: context(superAdmin),
      enabled: true,
      key: "payments_enabled",
      reason: "Synthetic payment incident has been resolved.",
    });
    expect(await paymentsAreEnabled()).toBe(true);
  });
});

describe("two-stage Dodo provider refunds", () => {
  it("is disabled by default and never double-submits an idempotent confirmation", async () => {
    const operations = await createAdmin("operations");
    const listing = await createListing();
    const paymentId = await createProviderPayment(listing.id);
    const { confirmProviderRefund, prepareProviderRefund } =
      await import("@/server/admin/refunds");
    const disabled = await prepareProviderRefund({
      amountPaise: 10_000n,
      context: context(operations),
      providerPaymentId: paymentId,
      reason: "Synthetic provider refund preparation is disabled.",
    });
    expect(disabled.kind).toBe("rejected");

    await directSql`
      UPDATE private.operational_flags
      SET value = '{"enabled": true}'::jsonb
      WHERE key = 'provider_refunds_enabled'
    `;
    const prepareId = randomUUID();
    const prepared = await prepareProviderRefund({
      amountPaise: 10_000n,
      context: context(operations, prepareId),
      providerPaymentId: paymentId,
      reason: "Synthetic two-stage Dodo refund preparation evidence.",
    });
    expect(prepared.kind).toBe("applied");
    expect(prepared.refundPublicId).toMatch(/^arf_/);
    expect(
      (
        await prepareProviderRefund({
          amountPaise: 10_000n,
          context: context(operations, prepareId),
          providerPaymentId: paymentId,
          reason: "Synthetic two-stage Dodo refund preparation evidence.",
        })
      ).kind,
    ).toBe("duplicate");

    const submit = vi.fn().mockResolvedValue({
      providerRefundId: `phase10-refund-${randomUUID()}`,
    });
    const confirmed = await confirmProviderRefund({
      context: context(operations),
      executor: { submit },
      reason: "Second explicit confirmation for the synthetic Dodo refund.",
      refundPublicId: prepared.refundPublicId!,
    });
    expect(confirmed.kind).toBe("applied");
    expect(submit).toHaveBeenCalledTimes(1);
    expect(
      (
        await confirmProviderRefund({
          context: context(operations),
          executor: { submit },
          reason: "Retry of the confirmed synthetic Dodo refund request.",
          refundPublicId: prepared.refundPublicId!,
        })
      ).kind,
    ).toBe("duplicate");
    expect(submit).toHaveBeenCalledTimes(1);

    const [state] = await directSql<
      { ledger_entries: bigint; state: string }[]
    >`
      SELECT request.state,
             (SELECT count(*)::bigint FROM private.financial_ledger
              WHERE listing_id = ${listing.id}) AS ledger_entries
      FROM private.admin_refund_requests AS request
      WHERE request.public_id = ${prepared.refundPublicId!}
    `;
    expect(state).toEqual({ ledger_entries: 0n, state: "submitted" });

    const { getAdminDashboard } = await import("@/server/admin/read-model");
    expect((await getAdminDashboard("reviewer")).refunds).toEqual([]);
    expect(
      (await getAdminDashboard("operations")).refunds.some(
        (row) => row.public_id === prepared.refundPublicId,
      ),
    ).toBe(true);
  });
});
