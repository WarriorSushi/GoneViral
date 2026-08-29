import "server-only";

import { getSqlClient } from "@/server/db/client";

import { hasAdminPermission, type AdminRole } from "./permissions";

export async function getAdminDashboard(role: AdminRole) {
  const sql = getSqlClient();
  const reports = await sql`
        SELECT report.public_id, report.reason_category, report.explanation,
               report.state, report.created_at, listing.public_id AS listing_public_id,
               listing.name AS listing_name
        FROM private.reports AS report
        JOIN app.listings AS listing ON listing.id = report.listing_id
        WHERE report.state IN ('pending', 'reviewing')
        ORDER BY report.created_at ASC LIMIT 50
      `;
  const changes = await sql`
        SELECT request.id, request.change_type, request.old_value,
               request.proposed_value, request.created_at,
               listing.public_id AS listing_public_id, listing.name AS listing_name
        FROM private.listing_change_requests AS request
        JOIN app.listings AS listing ON listing.id = request.listing_id
        WHERE request.state = 'pending'
        ORDER BY request.created_at ASC LIMIT 50
      `;
  const moderation = await sql`
        SELECT public_id, name, lifecycle_status, moderation_status,
               confirmed_total_paise
        FROM app.listings
        WHERE moderation_status IN ('pending_review', 'suspended')
           OR lifecycle_status = 'removed'
        ORDER BY updated_at DESC LIMIT 50
      `;
  const paymentExceptions = hasAdminPermission(role, "payments:view")
    ? await sql`
        SELECT event.id, event.provider_event_type, event.processing_state,
               event.semantic_error_code, event.received_at,
               attempt.public_id AS attempt_public_id,
               listing.public_id AS listing_public_id,
               event.provider_payment_id
        FROM private.provider_events AS event
        LEFT JOIN private.payment_attempts AS attempt
          ON attempt.id = event.payment_attempt_id
        LEFT JOIN app.listings AS listing ON listing.id = attempt.listing_id
        WHERE event.processing_state = 'quarantined'
        ORDER BY event.received_at DESC LIMIT 50
      `
    : [];
  const reconciliation = hasAdminPermission(role, "payments:view")
    ? await sql`
        SELECT item.id, item.discrepancy_type, item.state, item.created_at,
               listing.public_id AS listing_public_id,
               item.provider_object_id
        FROM private.reconciliation_items AS item
        LEFT JOIN app.listings AS listing ON listing.id = item.listing_id
        WHERE item.state IN ('open', 'investigating')
        ORDER BY item.created_at DESC LIMIT 50
      `
    : [];
  const emails = await sql`
        SELECT id, kind, state, attempt_count, last_error_code, created_at
        FROM private.email_outbox
        WHERE state IN ('failed_retryable', 'dead_letter')
        ORDER BY created_at DESC LIMIT 50
      `;
  const flags = await sql`
        SELECT key, value, updated_at FROM private.operational_flags
        WHERE key IN ('read_only', 'payments_enabled', 'provider_refunds_enabled')
        ORDER BY key
      `;
  const refunds = hasAdminPermission(role, "payments:view")
    ? await sql`
        SELECT public_id, state, amount_paise, currency, created_at,
               provider_payment_id,
               provider_refund_id
        FROM private.admin_refund_requests
        ORDER BY created_at DESC LIMIT 50
      `
    : [];
  return {
    changes,
    emails,
    flags,
    moderation,
    paymentExceptions,
    reconciliation,
    refunds,
    reports,
  };
}

export async function getAdminListingDetail(
  role: AdminRole,
  listingPublicId: string,
) {
  const sql = getSqlClient();
  const [listing] = await sql`
    SELECT listing.id, listing.public_id, listing.slug, listing.name,
           listing.tagline, listing.destination_host, listing.category_id,
           listing.lifecycle_status, listing.moderation_status,
           listing.confirmed_total_paise, listing.original_sponsorship_paise,
           listing.current_total_reached_at, listing.updated_at
    FROM app.listings AS listing WHERE listing.public_id = ${listingPublicId}
  `;
  if (!listing) return null;
  const ledger = await sql`
      SELECT id, entry_type, amount_delta_paise, applied_at,
             applied_business_date, reason_code
      FROM private.financial_ledger WHERE listing_id = ${listing.id}
      ORDER BY applied_at DESC, id DESC LIMIT 100
    `;
  const reports = await sql`
      SELECT public_id, reason_category, explanation, state, created_at,
             reviewed_at
      FROM private.reports WHERE listing_id = ${listing.id}
      ORDER BY created_at DESC LIMIT 100
    `;
  const moderation = await sql`
      SELECT action_type, from_status, to_status, reason_code, public_reason,
             internal_note, created_at
      FROM private.moderation_actions WHERE listing_id = ${listing.id}
      ORDER BY created_at DESC LIMIT 100
    `;
  const audit = await sql`
      SELECT action, actor_role, reason, before_snapshot, after_snapshot,
             created_at
      FROM private.admin_audit_events
      WHERE target_id = ${listingPublicId} OR target_id IN (
        SELECT id::text FROM private.listing_change_requests
        WHERE listing_id = ${listing.id}
      )
      ORDER BY created_at DESC LIMIT 100
    `;
  const payments = hasAdminPermission(role, "payments:view")
    ? await sql`
          SELECT attempt.public_id AS attempt_public_id, attempt.purpose,
                 attempt.state, attempt.amount_paise, attempt.created_at,
                 payment.provider_payment_id, payment.status AS payment_status
          FROM private.payment_attempts AS attempt
          LEFT JOIN private.provider_payments AS payment
            ON payment.payment_attempt_id = attempt.id
          WHERE attempt.listing_id = ${listing.id}
          ORDER BY attempt.created_at DESC LIMIT 100
        `
    : await sql`
          SELECT attempt.public_id AS attempt_public_id, attempt.purpose,
                 attempt.state, attempt.amount_paise, attempt.created_at,
                 '[redacted]'::text AS provider_payment_id,
                 NULL::text AS payment_status
          FROM private.payment_attempts AS attempt
          WHERE attempt.listing_id = ${listing.id}
          ORDER BY attempt.created_at DESC LIMIT 100
        `;
  return { audit, ledger, listing, moderation, payments, reports };
}
