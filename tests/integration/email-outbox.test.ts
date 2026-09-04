import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { closeDatabase, getSqlClient } from "@/server/db/client";
import { resumeEmailOutbox } from "@/server/admin/operations";
import { getAdminDashboard } from "@/server/admin/read-model";
import { enqueueVerificationDelayIfDue } from "@/server/email/enqueue-verification-delay";
import {
  deliverEmailOutboxById,
  drainEmailOutbox,
} from "@/server/email/outbox";
import {
  EmailProviderError,
  type EmailDeliveryProvider,
} from "@/server/email/provider";
import { processResendDeliveryEvent } from "@/server/email/resend-webhook";
import { EMAIL_TEMPLATE_VERSION } from "@/server/email/templates";
import { encryptPrivateText } from "@/server/security/private-data";

const runtimeDatabaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres.pooler-dev:postgres@127.0.0.1:54329/postgres";
const directDatabaseUrl =
  process.env.DATABASE_DIRECT_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const supabaseApiUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
let deadLetterId = "";
let adminUserId = "";

function fixtures(command: "clear" | "seed") {
  execFileSync(process.execPath, ["scripts/db/phase3-fixtures.mjs", command], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_DIRECT_URL: directDatabaseUrl },
    stdio: "pipe",
  });
}

async function clearEmailFixtures() {
  await getSqlClient()`ALTER TABLE private.email_provider_events DISABLE TRIGGER email_provider_events_append_only`;
  await getSqlClient()`DELETE FROM private.email_provider_events`;
  await getSqlClient()`ALTER TABLE private.email_provider_events ENABLE TRIGGER email_provider_events_append_only`;
  await getSqlClient()`DELETE FROM private.email_outbox`;
}

async function insertEmail(input?: {
  attemptCount?: number;
  idempotencyKey?: string;
  state?: string;
}) {
  const idempotencyKey = input?.idempotencyKey ?? `phase12-${randomUUID()}`;
  const [row] = await getSqlClient()<{ id: string }[]>`
    INSERT INTO private.email_outbox (
      kind, recipient_encrypted, recipient_hash, template_version, payload,
      idempotency_key, state, attempt_count, next_attempt_at
    ) VALUES (
      'management_link_requested',
      ${encryptPrivateText("phase12-owner@example.com")},
      'phase12-recipient-hash', ${EMAIL_TEMPLATE_VERSION},
      '{"listingName":"Phase 12 Studio","listingPublicId":"phase12_listing"}'::jsonb,
      ${idempotencyKey}, ${input?.state ?? "pending"},
      ${input?.attemptCount ?? 0}, transaction_timestamp()
    ) RETURNING id
  `;
  if (!row) throw new Error("phase12_email_fixture_missing");
  return row.id;
}

beforeAll(async () => {
  process.env.DATABASE_URL = runtimeDatabaseUrl;
  process.env.DATABASE_DIRECT_URL = directDatabaseUrl;
  process.env.EMAIL_DELIVERY_MODE = "mock";
  process.env.NEXT_PUBLIC_SITE_URL = "https://goneviral.in";
  vi.stubEnv("NODE_ENV", "test");
  fixtures("clear");
  fixtures("seed");
  await clearEmailFixtures();
});

afterAll(async () => {
  await clearEmailFixtures();
  if (adminUserId) {
    await getSqlClient()`ALTER TABLE private.admin_audit_events DISABLE TRIGGER admin_audit_events_append_only`;
    await getSqlClient()`DELETE FROM private.admin_audit_events WHERE actor_user_id = ${adminUserId}`;
    await getSqlClient()`ALTER TABLE private.admin_audit_events ENABLE TRIGGER admin_audit_events_append_only`;
    await getSqlClient()`DELETE FROM private.admin_users WHERE user_id = ${adminUserId}`;
    await getSqlClient()`DELETE FROM auth.users WHERE id = ${adminUserId}`;
  }
  fixtures("clear");
  await closeDatabase();
});

describe("Phase 12 durable email outbox", () => {
  it("queues one durable verification-delay message for an old pending attempt", async () => {
    const publicId = `att_${randomUUID().replaceAll("-", "").slice(0, 24)}`;
    const [attempt] = await getSqlClient()<{ id: string }[]>`
      INSERT INTO private.payment_attempts (
        public_id, application_idempotency_key, provider,
        provider_environment, listing_id, purpose, state, amount_paise,
        currency, policy_version, minimum_required_paise_snapshot,
        listing_total_paise_snapshot, pending_owner_id,
        provider_order_request_hash, checkout_expires_at, created_at
      ) VALUES (
        ${publicId}, ${`phase12-delay-${randomUUID()}`}, 'fixture', 'local',
        '10000000-0000-4000-8000-000000000001', 'initial_sponsorship',
        'checkout_ready', 49900, 'INR', '2026-08-28-v1', 49900, 0,
        '20000000-0000-4000-8000-000000000001',
        ${`phase12-delay-hash-${randomUUID()}`},
        transaction_timestamp() + interval '15 minutes',
        transaction_timestamp() - interval '16 minutes'
      ) RETURNING id
    `;
    expect(attempt).toBeDefined();
    await expect(enqueueVerificationDelayIfDue(publicId)).resolves.toBe(true);
    await expect(enqueueVerificationDelayIfDue(publicId)).resolves.toBe(false);
    const rows = await getSqlClient()<
      { kind: string; templateVersion: string }[]
    >`
      SELECT kind, template_version AS "templateVersion"
      FROM private.email_outbox
      WHERE idempotency_key = ${`verification-delay:${attempt!.id}:${EMAIL_TEMPLATE_VERSION}`}
    `;
    expect(rows).toEqual([
      { kind: "verification_delay", templateVersion: EMAIL_TEMPLATE_VERSION },
    ]);
    await getSqlClient()`
      DELETE FROM private.email_outbox
      WHERE idempotency_key = ${`verification-delay:${attempt!.id}:${EMAIL_TEMPLATE_VERSION}`}
    `;
  });

  it("uses SKIP LOCKED so concurrent workers send one row once", async () => {
    const id = await insertEmail();
    const keys: string[] = [];
    const provider: EmailDeliveryProvider = {
      async send(input) {
        keys.push(input.idempotencyKey);
        await new Promise((resolve) => setTimeout(resolve, 30));
        return { providerMessageId: "resend-concurrency-1" };
      },
    };
    const results = await Promise.all([
      drainEmailOutbox({ limit: 1, provider }),
      drainEmailOutbox({ limit: 1, provider }),
    ]);
    expect(results.reduce((sum, result) => sum + result.claimed, 0)).toBe(1);
    expect(keys).toEqual([`goneviral-email/${id}`]);
    const [row] = await getSqlClient()<
      { attemptCount: number; deliveryState: string; state: string }[]
    >`
      SELECT state, attempt_count AS "attemptCount",
             delivery_state AS "deliveryState"
      FROM private.email_outbox WHERE id = ${id}
    `;
    expect(row).toEqual({
      attemptCount: 1,
      deliveryState: "accepted",
      state: "sent",
    });
  });

  it("delivers a newly queued payment email immediately and only once", async () => {
    const id = await insertEmail();
    const provider: EmailDeliveryProvider = {
      send: vi.fn().mockResolvedValue({
        providerMessageId: "resend-immediate-1",
      }),
    };

    await expect(deliverEmailOutboxById(id, provider)).resolves.toEqual({
      claimed: 1,
      deadLetter: 0,
      retryable: 0,
      sent: 1,
    });
    await expect(deliverEmailOutboxById(id, provider)).resolves.toEqual({
      claimed: 0,
      deadLetter: 0,
      retryable: 0,
      sent: 0,
    });
    expect(provider.send).toHaveBeenCalledOnce();
  });

  it("retries with the same provider key and bounds retryable failures", async () => {
    const id = await insertEmail();
    const keys: string[] = [];
    let calls = 0;
    const provider: EmailDeliveryProvider = {
      async send(input) {
        keys.push(input.idempotencyKey);
        calls += 1;
        if (calls === 1) {
          throw new EmailProviderError("resend_503", true);
        }
        return { providerMessageId: "resend-retry-1" };
      },
    };
    await expect(deliverEmailOutboxById(id, provider)).resolves.toEqual({
      claimed: 1,
      deadLetter: 0,
      retryable: 1,
      sent: 0,
    });
    await getSqlClient()`
      UPDATE private.email_outbox SET next_attempt_at = transaction_timestamp()
      WHERE id = ${id}
    `;
    await expect(drainEmailOutbox({ limit: 1, provider })).resolves.toEqual({
      claimed: 1,
      deadLetter: 0,
      retryable: 0,
      sent: 1,
    });
    expect(keys).toEqual([`goneviral-email/${id}`, `goneviral-email/${id}`]);

    const deadId = await insertEmail({ attemptCount: 4 });
    deadLetterId = deadId;
    const alwaysFail: EmailDeliveryProvider = {
      async send() {
        throw new EmailProviderError("resend_503", true);
      },
    };
    await expect(
      drainEmailOutbox({ limit: 1, provider: alwaysFail }),
    ).resolves.toMatchObject({ deadLetter: 1 });
    const [dead] = await getSqlClient()<
      { attemptCount: number; state: string }[]
    >`
      SELECT state, attempt_count AS "attemptCount"
      FROM private.email_outbox WHERE id = ${deadId}
    `;
    expect(dead).toEqual({ attemptCount: 5, state: "dead_letter" });
  });

  it("keeps ledger state intact when delivery fails", async () => {
    const [before] = await getSqlClient()<
      { ledgerCount: bigint; ledgerSum: bigint; total: bigint }[]
    >`
      SELECT listing.confirmed_total_paise AS total,
             count(ledger.id)::bigint AS "ledgerCount",
             sum(ledger.amount_delta_paise)::bigint AS "ledgerSum"
      FROM app.listings AS listing
      JOIN private.financial_ledger AS ledger ON ledger.listing_id = listing.id
      WHERE listing.slug = 'monsoon-studio' GROUP BY listing.id
    `;
    await insertEmail();
    const failingProvider: EmailDeliveryProvider = {
      async send() {
        throw new EmailProviderError("resend_503", true);
      },
    };
    await drainEmailOutbox({ limit: 1, provider: failingProvider });
    const [after] = await getSqlClient()<
      { ledgerCount: bigint; ledgerSum: bigint; total: bigint }[]
    >`
      SELECT listing.confirmed_total_paise AS total,
             count(ledger.id)::bigint AS "ledgerCount",
             sum(ledger.amount_delta_paise)::bigint AS "ledgerSum"
      FROM app.listings AS listing
      JOIN private.financial_ledger AS ledger ON ledger.listing_id = listing.id
      WHERE listing.slug = 'monsoon-studio' GROUP BY listing.id
    `;
    expect(after).toEqual(before);
  });

  it("shows failed/dead letters to admins and resumes only unsent rows with audit", async () => {
    expect(deadLetterId).not.toBe("");
    const email = `phase12-admin-${randomUUID()}@example.test`;
    const signup = await fetch(`${supabaseApiUrl}/auth/v1/signup`, {
      body: JSON.stringify({ email, password: `phase12-${randomUUID()}` }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    expect(signup.ok).toBe(true);
    const auth = (await signup.json()) as { user: { id: string } };
    adminUserId = auth.user.id;
    await getSqlClient()`
      INSERT INTO private.admin_users (user_id, role, is_active)
      VALUES (${adminUserId}, 'super_admin', true)
    `;
    const dashboard = await getAdminDashboard("super_admin");
    expect(dashboard.emails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: deadLetterId, state: "dead_letter" }),
      ]),
    );
    await expect(
      resumeEmailOutbox({
        context: {
          requestId: `phase12-resume-${randomUUID()}`,
          session: {
            authenticatedAt: new Date(),
            email,
            role: "super_admin",
            userId: adminUserId,
          },
        },
        emailOutboxId: deadLetterId,
        reason: "Resume after correcting the verified sender configuration.",
      }),
    ).resolves.toEqual({ kind: "applied" });
    const [row] = await getSqlClient()<
      { attemptCount: number; state: string }[]
    >`
      SELECT state, attempt_count AS "attemptCount"
      FROM private.email_outbox WHERE id = ${deadLetterId}
    `;
    expect(row).toEqual({ attemptCount: 0, state: "pending" });
  });

  it("tracks signed-provider delivery outcomes idempotently without recipients", async () => {
    const id = await insertEmail();
    await getSqlClient()`
      UPDATE private.email_outbox
      SET state = 'sent', provider_message_id = 'resend-delivery-1',
          delivery_state = 'accepted', sent_at = transaction_timestamp()
      WHERE id = ${id}
    `;
    const deliveredAt = new Date("2026-08-29T05:00:00.000Z");
    const event = {
      eventId: "phase12-delivered-event",
      occurredAt: deliveredAt,
      providerMessageId: "resend-delivery-1",
      type: "email.delivered" as const,
    };
    await expect(processResendDeliveryEvent(event)).resolves.toEqual({
      kind: "processed",
    });
    await expect(processResendDeliveryEvent(event)).resolves.toEqual({
      kind: "duplicate",
    });
    await expect(
      processResendDeliveryEvent({
        ...event,
        eventId: "phase12-bounced-event",
        occurredAt: new Date("2026-08-29T05:01:00.000Z"),
        type: "email.bounced",
      }),
    ).resolves.toEqual({ kind: "processed" });
    const [row] = await getSqlClient()<
      { deliveryState: string; lastErrorCode: string }[]
    >`
      SELECT delivery_state AS "deliveryState",
             last_error_code AS "lastErrorCode"
      FROM private.email_outbox WHERE id = ${id}
    `;
    expect(row).toEqual({
      deliveryState: "bounced",
      lastErrorCode: "resend_delivery_bounced",
    });
    const events = await getSqlClient()`
      SELECT event_id, provider_message_id, event_type
      FROM private.email_provider_events ORDER BY occurred_at
    `;
    expect(events).toHaveLength(2);
    expect(JSON.stringify(events)).not.toContain("phase12-owner@example.com");
  });
});
