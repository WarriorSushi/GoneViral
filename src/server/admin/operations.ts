import "server-only";

import { randomUUID } from "node:crypto";

import type postgres from "postgres";

import { canonicalizeDestination } from "@/domain/destination";
import { normalizeListingName } from "@/domain/listing-edit";
import { getSqlClient } from "@/server/db/client";
import { EMAIL_TEMPLATE_VERSION } from "@/server/email/templates";
import { encryptPrivateText } from "@/server/security/private-data";
import { submissionDigest } from "@/server/security/submission-security";

import type { AdminSession } from "./auth";
import { hasAdminPermission, type AdminPermission } from "./permissions";

type Transaction = postgres.TransactionSql<{ bigint: bigint }>;

export type AdminRequestContext = Readonly<{
  ipHmac?: string;
  requestId: string;
  session: AdminSession;
  userAgentSummary?: string;
}>;

export type AdminOperationResult = Readonly<{
  kind: "applied" | "duplicate" | "rejected";
  listingPublicIds?: readonly string[];
  message?: string;
}>;

function reject(message: string): AdminOperationResult {
  return { kind: "rejected", message };
}

class AdminRejectedError extends Error {}

async function enqueueListingOwnerNotification(
  transaction: Transaction,
  input: {
    idempotencyKey: string;
    kind: "change_request_result" | "moderation_result";
    listingId: string;
    payload: Record<string, unknown>;
  },
) {
  const [owner] = await transaction<
    { canonical_email: string; email_hash: string }[]
  >`
    SELECT lower(auth_user.email) AS canonical_email, ''::text AS email_hash
    FROM private.listing_owners AS ownership
    JOIN auth.users AS auth_user ON auth_user.id = ownership.user_id
    WHERE ownership.listing_id = ${input.listingId}
      AND ownership.revoked_at IS NULL AND auth_user.email IS NOT NULL
    UNION ALL
    SELECT pending.canonical_email, pending.email_hash
    FROM private.pending_listing_owners AS pending
    WHERE pending.listing_id = ${input.listingId}
    LIMIT 1
  `;
  if (!owner) return;
  await transaction`
    INSERT INTO private.email_outbox (
      kind, recipient_encrypted, recipient_hash, template_version, payload,
      idempotency_key, state, next_attempt_at
    ) VALUES (
      ${input.kind}, ${encryptPrivateText(owner.canonical_email)},
      ${owner.email_hash || submissionDigest(owner.canonical_email)},
      ${EMAIL_TEMPLATE_VERSION},
      (${JSON.stringify(input.payload)}::jsonb #>> '{}')::jsonb,
      ${input.idempotencyKey}, 'pending', transaction_timestamp()
    ) ON CONFLICT (idempotency_key) DO NOTHING
  `;
}

function validateContext(
  context: AdminRequestContext,
  permission: AdminPermission,
  reason: string,
) {
  if (!hasAdminPermission(context.session.role, permission))
    throw new Error("admin_permission_denied");
  if (context.requestId.length < 8 || context.requestId.length > 200)
    throw new Error("admin_request_id_invalid");
  if (reason.trim().length < 8 || reason.trim().length > 1_000)
    throw new Error("admin_reason_invalid");
}

async function insertAudit(
  transaction: Transaction,
  input: {
    action: string;
    after: postgres.JSONValue;
    before: postgres.JSONValue;
    context: AdminRequestContext;
    reason: string;
    targetId: string;
    targetType: string;
  },
) {
  return transaction<{ id: string }[]>`
    INSERT INTO private.admin_audit_events (
      actor_user_id, actor_role, action, target_type, target_id, request_id,
      reason, before_snapshot, after_snapshot, ip_hmac, user_agent_summary
    ) VALUES (
      ${input.context.session.userId}, ${input.context.session.role},
      ${input.action}, ${input.targetType}, ${input.targetId},
      ${input.context.requestId}, ${input.reason.trim()},
      (${JSON.stringify(input.before)}::jsonb #>> '{}')::jsonb,
      (${JSON.stringify(input.after)}::jsonb #>> '{}')::jsonb,
      ${input.context.ipHmac ?? null},
      ${input.context.userAgentSummary?.slice(0, 240) ?? null}
    ) ON CONFLICT (request_id, action, target_type, target_id) DO NOTHING
    RETURNING id
  `;
}

export async function moderateListing(input: {
  action: "clear" | "remove" | "suspend" | "unsuspend";
  context: AdminRequestContext;
  listingPublicId: string;
  publicReason?: string;
  reason: string;
}): Promise<AdminOperationResult> {
  validateContext(
    input.context,
    input.action === "remove" ? "listings:remove" : "listings:moderate",
    input.reason,
  );
  return getSqlClient().begin(async (transaction) => {
    const [listing] = await transaction<
      {
        confirmed_total_paise: bigint;
        id: string;
        lifecycle_status: string;
        moderation_status: string;
        name: string;
        public_id: string;
      }[]
    >`
      SELECT id, public_id, name, lifecycle_status, moderation_status,
             confirmed_total_paise
      FROM app.listings WHERE public_id = ${input.listingPublicId}
      FOR UPDATE
    `;
    if (!listing) return reject("Listing not found.");
    if (
      input.action === "unsuspend" &&
      (listing.lifecycle_status !== "active" ||
        listing.confirmed_total_paise <= 0n)
    ) {
      return reject(
        "Only a financially active positive listing can be restored.",
      );
    }
    const nextLifecycle =
      input.action === "remove" ? "removed" : listing.lifecycle_status;
    const nextModeration =
      input.action === "suspend"
        ? "suspended"
        : input.action === "clear" || input.action === "unsuspend"
          ? "clear"
          : listing.moderation_status;
    const before = {
      confirmedTotalPaise: listing.confirmed_total_paise.toString(),
      lifecycleStatus: listing.lifecycle_status,
      moderationStatus: listing.moderation_status,
    };
    const after = {
      confirmedTotalPaise: listing.confirmed_total_paise.toString(),
      lifecycleStatus: nextLifecycle,
      moderationStatus: nextModeration,
    };
    const inserted = await insertAudit(transaction, {
      action: `listing_${input.action}`,
      after,
      before,
      context: input.context,
      reason: input.reason,
      targetId: listing.public_id,
      targetType: "listing",
    });
    if (inserted.length === 0) return { kind: "duplicate" } as const;
    await transaction`
      UPDATE app.listings
      SET lifecycle_status = ${nextLifecycle},
          moderation_status = ${nextModeration}, version = version + 1,
          updated_at = transaction_timestamp()
      WHERE id = ${listing.id}
    `;
    await transaction`
      INSERT INTO private.moderation_actions (
        listing_id, action_type, from_status, to_status, reason_code,
        public_reason, internal_note, admin_user_id
      ) VALUES (
        ${listing.id}, ${input.action},
        ${input.action === "remove" ? listing.lifecycle_status : listing.moderation_status},
        ${input.action === "remove" ? nextLifecycle : nextModeration},
        'admin_review', ${input.publicReason?.trim().slice(0, 500) ?? null},
        ${input.reason.trim()}, ${input.context.session.userId}
      )
    `;
    await enqueueListingOwnerNotification(transaction, {
      idempotencyKey: `moderation-result:${inserted[0]!.id}`,
      kind: "moderation_result",
      listingId: listing.id,
      payload: {
        listingName: listing.name,
        listingPublicId: listing.public_id,
        outcome:
          input.action === "remove"
            ? "removed"
            : input.action === "suspend"
              ? "suspended"
              : input.action === "unsuspend"
                ? "unsuspended"
                : "clear",
        ...(input.publicReason
          ? { publicReason: input.publicReason.trim().slice(0, 500) }
          : {}),
      },
    });
    return {
      kind: "applied",
      listingPublicIds: [listing.public_id],
    } as const;
  });
}

export async function resolveReport(input: {
  context: AdminRequestContext;
  reason: string;
  reportPublicId: string;
  resolution: "dismissed" | "resolved";
}): Promise<AdminOperationResult> {
  validateContext(input.context, "reports:view", input.reason);
  return getSqlClient().begin(async (transaction) => {
    const [report] = await transaction<
      { id: string; listing_public_id: string; state: string }[]
    >`
      SELECT report.id, report.state, listing.public_id AS listing_public_id
      FROM private.reports AS report
      JOIN app.listings AS listing ON listing.id = report.listing_id
      WHERE report.public_id = ${input.reportPublicId} FOR UPDATE OF report
    `;
    if (!report) return reject("Report not found.");
    const inserted = await insertAudit(transaction, {
      action: `report_${input.resolution}`,
      after: { state: input.resolution },
      before: { state: report.state },
      context: input.context,
      reason: input.reason,
      targetId: input.reportPublicId,
      targetType: "report",
    });
    if (inserted.length === 0) return { kind: "duplicate" } as const;
    await transaction`
      UPDATE private.reports SET state = ${input.resolution},
        reviewed_by_admin_id = ${input.context.session.userId},
        reviewed_at = transaction_timestamp()
      WHERE id = ${report.id}
    `;
    return {
      kind: "applied",
      listingPublicIds: [report.listing_public_id],
    } as const;
  });
}

export async function reviewChangeRequest(input: {
  allowReassignment?: boolean;
  changeRequestId: string;
  context: AdminRequestContext;
  decision: "approved" | "rejected";
  reason: string;
}): Promise<AdminOperationResult> {
  validateContext(input.context, "requests:review", input.reason);
  if (input.allowReassignment) {
    validateContext(input.context, "requests:reassign", input.reason);
    if (input.reason.trim().length < 20)
      return reject("Reassignment requires an evidence-based reason.");
  }
  try {
    return await getSqlClient().begin(async (transaction) => {
      const [request] = await transaction<
        {
          change_type: string;
          id: string;
          listing_id: string;
          old_value: Record<string, unknown>;
          proposed_value: Record<string, unknown>;
          public_id: string;
          listing_name: string;
          state: string;
        }[]
      >`
      SELECT request.id, request.listing_id, request.change_type,
             request.old_value, request.proposed_value, request.state,
             listing.public_id, listing.name AS listing_name
      FROM private.listing_change_requests AS request
      JOIN app.listings AS listing ON listing.id = request.listing_id
      WHERE request.id = ${input.changeRequestId}
      FOR UPDATE OF request, listing
    `;
      if (!request) return reject("Change request not found.");
      if (request.state !== "pending") return { kind: "duplicate" } as const;
      const inserted = await insertAudit(transaction, {
        action: `change_request_${input.decision}`,
        after: { changeType: request.change_type, state: input.decision },
        before: { changeType: request.change_type, state: request.state },
        context: input.context,
        reason: input.reason,
        targetId: request.id,
        targetType: "listing_change_request",
      });
      if (inserted.length === 0) return { kind: "duplicate" } as const;

      const affectedPublicIds = [request.public_id];
      if (input.decision === "approved") {
        if (request.change_type === "name") {
          const name = request.proposed_value.name;
          if (
            typeof name !== "string" ||
            name.trim().length < 1 ||
            name.length > 160
          )
            throw new AdminRejectedError("Proposed name is invalid.");
          await transaction`
          UPDATE app.listings SET name = ${name.trim()},
            name_normalized = ${normalizeListingName(name.trim())},
            version = version + 1, updated_at = transaction_timestamp()
          WHERE id = ${request.listing_id}
        `;
        } else if (request.change_type === "tagline") {
          const tagline = request.proposed_value.tagline;
          if (
            typeof tagline !== "string" ||
            tagline.trim().length < 1 ||
            tagline.length > 320
          )
            throw new AdminRejectedError("Proposed tagline is invalid.");
          await transaction`
          UPDATE app.listings SET tagline = ${tagline.trim()},
            version = version + 1, updated_at = transaction_timestamp()
          WHERE id = ${request.listing_id}
        `;
        } else if (request.change_type === "category") {
          const categoryId = request.proposed_value.id;
          const [category] =
            typeof categoryId === "string"
              ? await transaction<{ id: string }[]>`
                SELECT id FROM app.categories WHERE id = ${categoryId}
                  AND is_active = true LIMIT 1
              `
              : [];
          if (!category)
            throw new AdminRejectedError("Proposed category is unavailable.");
          await transaction`
          UPDATE app.listings SET category_id = ${category.id},
            version = version + 1, updated_at = transaction_timestamp()
          WHERE id = ${request.listing_id}
        `;
        } else if (request.change_type === "destination") {
          const proposedUrl = request.proposed_value.url;
          if (typeof proposedUrl !== "string")
            throw new AdminRejectedError("Proposed destination is invalid.");
          const destination = canonicalizeDestination(proposedUrl);
          if (!destination.ok)
            throw new AdminRejectedError("Proposed destination is unsafe.");
          const [conflict] = await transaction<
            { id: string; lifecycle_status: string; public_id: string }[]
          >`
          SELECT id, public_id, lifecycle_status FROM app.listings
          WHERE destination_canonical_key = ${destination.value.canonicalKey}
            AND id <> ${request.listing_id}
          FOR UPDATE
        `;
          if (conflict) {
            if (
              !input.allowReassignment ||
              conflict.lifecycle_status !== "removed"
            )
              throw new AdminRejectedError(
                "Destination remains assigned to another listing.",
              );
            const releaseAudit = await insertAudit(transaction, {
              action: "destination_released",
              after: { released: true },
              before: { canonicalKey: destination.value.canonicalKey },
              context: input.context,
              reason: input.reason,
              targetId: conflict.public_id,
              targetType: "listing",
            });
            if (releaseAudit.length === 0)
              return { kind: "duplicate" } as const;
            await transaction`
            UPDATE app.listings
            SET destination_canonical_key = ${`released:${conflict.id}:${randomUUID()}`},
                version = version + 1, updated_at = transaction_timestamp()
            WHERE id = ${conflict.id} AND lifecycle_status = 'removed'
          `;
            affectedPublicIds.push(conflict.public_id);
          }
          await transaction`
          UPDATE app.listings
          SET destination_url = ${destination.value.url},
              destination_canonical_key = ${destination.value.canonicalKey},
              destination_host = ${destination.value.host},
              version = version + 1, updated_at = transaction_timestamp()
          WHERE id = ${request.listing_id}
        `;
        } else {
          throw new AdminRejectedError("Unsupported change request type.");
        }
      }
      await transaction`
      UPDATE private.listing_change_requests
      SET state = ${input.decision},
          reviewed_by_admin_id = ${input.context.session.userId},
          review_reason = ${input.reason.trim()},
          reviewed_at = transaction_timestamp()
      WHERE id = ${request.id}
    `;
      await enqueueListingOwnerNotification(transaction, {
        idempotencyKey: `change-request-result:${request.id}:${input.decision}`,
        kind: "change_request_result",
        listingId: request.listing_id,
        payload: {
          changeType: request.change_type,
          listingName: request.listing_name,
          listingPublicId: request.public_id,
          outcome: input.decision,
        },
      });
      return {
        kind: "applied",
        listingPublicIds: affectedPublicIds,
      } as const;
    });
  } catch (error) {
    if (error instanceof AdminRejectedError) return reject(error.message);
    throw error;
  }
}

export async function updateOperationalFlag(input: {
  context: AdminRequestContext;
  enabled: boolean;
  key:
    | "outbound_redirects_enabled"
    | "payments_enabled"
    | "provider_refunds_enabled"
    | "read_only";
  reason: string;
}): Promise<AdminOperationResult> {
  validateContext(input.context, "flags:manage", input.reason);
  return getSqlClient().begin(async (transaction) => {
    const [current] = await transaction<{ value: { enabled?: unknown } }[]>`
      SELECT value FROM private.operational_flags WHERE key = ${input.key}
      FOR UPDATE
    `;
    const before = {
      enabled:
        typeof current?.value.enabled === "boolean"
          ? current.value.enabled
          : null,
    };
    const after = { enabled: input.enabled };
    const inserted = await insertAudit(transaction, {
      action: "operational_flag_updated",
      after,
      before,
      context: input.context,
      reason: input.reason,
      targetId: input.key,
      targetType: "operational_flag",
    });
    if (inserted.length === 0) return { kind: "duplicate" } as const;
    await transaction`
      INSERT INTO private.operational_flags (key, value, updated_by)
      VALUES (
        ${input.key}, (${JSON.stringify(after)}::jsonb #>> '{}')::jsonb,
        ${input.context.session.userId}
      ) ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by,
          updated_at = transaction_timestamp()
    `;
    return { kind: "applied" } as const;
  });
}

export async function enqueueSafeManagementEmail(input: {
  context: AdminRequestContext;
  listingPublicId: string;
  reason: string;
}): Promise<AdminOperationResult> {
  validateContext(input.context, "safe_email:resend", input.reason);
  return getSqlClient().begin(async (transaction) => {
    const [owner] = await transaction<
      {
        canonical_email: string;
        email_hash: string;
        listing_id: string;
        name: string;
        public_id: string;
      }[]
    >`
      SELECT listing.id AS listing_id, listing.public_id, listing.name,
             pending.canonical_email, pending.email_hash
      FROM app.listings AS listing
      JOIN private.pending_listing_owners AS pending
        ON pending.listing_id = listing.id
      WHERE listing.public_id = ${input.listingPublicId}
      UNION ALL
      SELECT listing.id, listing.public_id, listing.name, lower(auth_user.email),
             ''::text
      FROM app.listings AS listing
      JOIN private.listing_owners AS ownership ON ownership.listing_id = listing.id
        AND ownership.revoked_at IS NULL
      JOIN auth.users AS auth_user ON auth_user.id = ownership.user_id
        AND auth_user.email IS NOT NULL
      WHERE listing.public_id = ${input.listingPublicId}
      LIMIT 1
    `;
    if (!owner) return reject("No safe owner email is available.");
    const inserted = await insertAudit(transaction, {
      action: "safe_management_email_queued",
      after: { queued: true },
      before: null,
      context: input.context,
      reason: input.reason,
      targetId: owner.public_id,
      targetType: "listing",
    });
    if (inserted.length === 0) return { kind: "duplicate" } as const;
    await transaction`
      INSERT INTO private.email_outbox (
        kind, recipient_encrypted, recipient_hash, template_version,
        payload, idempotency_key, state, next_attempt_at
      ) VALUES (
        'management_link_requested',
        ${encryptPrivateText(owner.canonical_email)},
        ${owner.email_hash || submissionDigest(owner.canonical_email)},
        ${EMAIL_TEMPLATE_VERSION},
        (${JSON.stringify({ listingName: owner.name, listingPublicId: owner.public_id })}::jsonb #>> '{}')::jsonb,
        ${`admin-management:${input.context.requestId}:${owner.listing_id}`},
        'pending', transaction_timestamp()
      ) ON CONFLICT (idempotency_key) DO NOTHING
    `;
    return { kind: "applied", listingPublicIds: [owner.public_id] } as const;
  });
}

export async function resumeEmailOutbox(input: {
  context: AdminRequestContext;
  emailOutboxId: string;
  reason: string;
}): Promise<AdminOperationResult> {
  validateContext(input.context, "safe_email:resend", input.reason);
  return getSqlClient().begin(async (transaction) => {
    const [email] = await transaction<
      {
        attempt_count: number;
        id: string;
        kind: string;
        provider_message_id: string | null;
        state: string;
      }[]
    >`
      SELECT id, kind, state, attempt_count, provider_message_id
      FROM private.email_outbox WHERE id = ${input.emailOutboxId}
      FOR UPDATE
    `;
    if (!email) return reject("Email outbox item not found.");
    if (!new Set(["dead_letter", "failed_retryable"]).has(email.state)) {
      return reject("Only failed unsent email can be resumed.");
    }
    if (email.provider_message_id) {
      return reject(
        "Provider-accepted email cannot be resent from this control.",
      );
    }
    const inserted = await insertAudit(transaction, {
      action: "email_outbox_resumed",
      after: { attemptCount: 0, state: "pending" },
      before: { attemptCount: email.attempt_count, state: email.state },
      context: input.context,
      reason: input.reason,
      targetId: email.id,
      targetType: "email_outbox",
    });
    if (inserted.length === 0) return { kind: "duplicate" } as const;
    await transaction`
      UPDATE private.email_outbox
      SET state = 'pending', attempt_count = 0,
          next_attempt_at = transaction_timestamp(), last_error_code = NULL,
          delivery_state = 'queued', delivery_updated_at = NULL
      WHERE id = ${email.id}
    `;
    return { kind: "applied" } as const;
  });
}
