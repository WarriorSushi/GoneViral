import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { listings } from "./app";

export const privateSchema = pgSchema("private");

const createdAt = () =>
  timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull();

const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull();

export const pendingListingOwners = privateSchema.table(
  "pending_listing_owners",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "restrict" }),
    canonicalEmail: text("canonical_email").notNull(),
    encryptedEmail: text("encrypted_email"),
    emailHash: text("email_hash").notNull(),
    claimState: text("claim_state").notNull(),
    // Circular attempt reference is added in the reviewed SQL migration.
    createdFromAttemptId: uuid("created_from_attempt_id"),
    // auth.users foreign keys are added explicitly in SQL because Auth is
    // platform-managed and not part of the Drizzle application schema.
    claimedByUserId: uuid("claimed_by_user_id"),
    claimedAt: timestamp("claimed_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("pending_listing_owners_listing_unique").on(table.listingId),
    check(
      "pending_listing_owners_claim_state_valid",
      sql`${table.claimState} in ('pending', 'claimed', 'superseded')`,
    ),
    check(
      "pending_listing_owners_claim_fields_valid",
      sql`${table.claimState} <> 'claimed' or (${table.claimedByUserId} is not null and ${table.claimedAt} is not null)`,
    ),
    index("pending_listing_owners_email_hash_idx").on(table.emailHash),
    index("pending_listing_owners_attempt_idx").on(table.createdFromAttemptId),
    index("pending_listing_owners_claimed_user_idx").on(table.claimedByUserId),
  ],
);

export const listingOwners = privateSchema.table(
  "listing_owners",
  {
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "restrict" }),
    userId: uuid("user_id").notNull(),
    role: text("role").default("owner").notNull(),
    createdAt: createdAt(),
    revokedAt: timestamp("revoked_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdBy: uuid("created_by"),
  },
  (table) => [
    primaryKey({ columns: [table.listingId, table.userId] }),
    check("listing_owners_role_valid", sql`${table.role} = 'owner'`),
    uniqueIndex("listing_owners_one_active_owner_per_listing")
      .on(table.listingId)
      .where(sql`${table.revokedAt} is null`),
    index("listing_owners_active_user_idx")
      .on(table.userId, table.listingId)
      .where(sql`${table.revokedAt} is null`),
    index("listing_owners_user_idx").on(table.userId),
    index("listing_owners_created_by_idx").on(table.createdBy),
  ],
);

export const paymentAttempts = privateSchema.table(
  "payment_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull(),
    applicationIdempotencyKey: text("application_idempotency_key").notNull(),
    provider: text("provider").notNull(),
    providerEnvironment: text("provider_environment").notNull(),
    providerOrderId: text("provider_order_id"),
    providerCheckoutSessionId: text("provider_checkout_session_id"),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "restrict" }),
    purpose: text("purpose").notNull(),
    state: text("state").notNull(),
    amountPaise: bigint("amount_paise", { mode: "bigint" }).notNull(),
    currency: text("currency").default("INR").notNull(),
    policyVersion: text("policy_version").notNull(),
    minimumRequiredPaiseSnapshot: bigint("minimum_required_paise_snapshot", {
      mode: "bigint",
    }).notNull(),
    targetListingIdSnapshot: uuid("target_listing_id_snapshot").references(
      () => listings.id,
      { onDelete: "restrict" },
    ),
    targetRankSnapshot: integer("target_rank_snapshot"),
    targetTotalPaiseSnapshot: bigint("target_total_paise_snapshot", {
      mode: "bigint",
    }),
    listingTotalPaiseSnapshot: bigint("listing_total_paise_snapshot", {
      mode: "bigint",
    }).notNull(),
    estimatedRankSnapshot: integer("estimated_rank_snapshot"),
    requestedByUserId: uuid("requested_by_user_id"),
    pendingOwnerId: uuid("pending_owner_id").references(
      () => pendingListingOwners.id,
      { onDelete: "restrict" },
    ),
    providerOrderRequestHash: text("provider_order_request_hash").notNull(),
    checkoutExpiresAt: timestamp("checkout_expires_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    // Circular ledger reference is added in SQL.
    fulfilledLedgerEntryId: uuid("fulfilled_ledger_entry_id"),
    failureCode: text("failure_code"),
    quarantineReason: text("quarantine_reason"),
    createdAt: createdAt(),
    providerCreatedAt: timestamp("provider_created_at", {
      withTimezone: true,
      mode: "date",
    }),
    succeededAt: timestamp("succeeded_at", {
      withTimezone: true,
      mode: "date",
    }),
    expiredAt: timestamp("expired_at", {
      withTimezone: true,
      mode: "date",
    }),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("payment_attempts_public_id_unique").on(table.publicId),
    unique("payment_attempts_environment_idempotency_unique").on(
      table.providerEnvironment,
      table.applicationIdempotencyKey,
    ),
    uniqueIndex("payment_attempts_provider_order_unique")
      .on(table.provider, table.providerEnvironment, table.providerOrderId)
      .where(sql`${table.providerOrderId} is not null`),
    uniqueIndex("payment_attempts_fulfilled_ledger_unique")
      .on(table.fulfilledLedgerEntryId)
      .where(sql`${table.fulfilledLedgerEntryId} is not null`),
    check(
      "payment_attempts_purpose_valid",
      sql`${table.purpose} in ('initial_sponsorship', 'raise')`,
    ),
    check(
      "payment_attempts_state_valid",
      sql`${table.state} in ('intent_created', 'provider_order_pending', 'checkout_ready', 'customer_returned', 'provider_pending', 'succeeded', 'failed', 'dropped', 'expired', 'quarantined', 'duplicate_paid', 'cancelled')`,
    ),
    check(
      "payment_attempts_amount_valid",
      sql`${table.amountPaise} > 0 and ${table.amountPaise} % 100 = 0`,
    ),
    check("payment_attempts_currency_inr", sql`${table.currency} = 'INR'`),
    check(
      "payment_attempts_minimum_valid",
      sql`${table.minimumRequiredPaiseSnapshot} > 0 and ${table.minimumRequiredPaiseSnapshot} % 100 = 0 and ${table.amountPaise} >= ${table.minimumRequiredPaiseSnapshot}`,
    ),
    check(
      "payment_attempts_listing_snapshot_valid",
      sql`${table.listingTotalPaiseSnapshot} >= 0 and ${table.listingTotalPaiseSnapshot} % 100 = 0`,
    ),
    check(
      "payment_attempts_target_snapshot_valid",
      sql`(${table.targetTotalPaiseSnapshot} is null or (${table.targetTotalPaiseSnapshot} >= 0 and ${table.targetTotalPaiseSnapshot} % 100 = 0)) and (${table.targetRankSnapshot} is null or ${table.targetRankSnapshot} > 0) and (${table.estimatedRankSnapshot} is null or ${table.estimatedRankSnapshot} > 0)`,
    ),
    check(
      "payment_attempts_actor_valid",
      sql`(${table.purpose} = 'initial_sponsorship' and ${table.pendingOwnerId} is not null) or (${table.purpose} = 'raise' and ${table.requestedByUserId} is not null and ${table.pendingOwnerId} is null)`,
    ),
    check(
      "payment_attempts_checkout_expiry_valid",
      sql`${table.checkoutExpiresAt} > ${table.createdAt}`,
    ),
    check(
      "payment_attempts_fulfilment_state_valid",
      sql`${table.state} <> 'succeeded' or (${table.fulfilledLedgerEntryId} is not null and ${table.succeededAt} is not null)`,
    ),
    index("payment_attempts_listing_created_idx").on(
      table.listingId,
      table.createdAt.desc(),
    ),
    index("payment_attempts_state_created_idx").on(
      table.state,
      table.createdAt,
    ),
    index("payment_attempts_provider_order_idx").on(
      table.provider,
      table.providerEnvironment,
      table.providerOrderId,
    ),
    index("payment_attempts_requester_created_idx").on(
      table.requestedByUserId,
      table.createdAt.desc(),
    ),
    index("payment_attempts_checkout_expiry_idx")
      .on(table.checkoutExpiresAt)
      .where(
        sql`${table.state} in ('intent_created', 'provider_order_pending', 'checkout_ready', 'customer_returned', 'provider_pending')`,
      ),
    index("payment_attempts_target_listing_idx").on(
      table.targetListingIdSnapshot,
    ),
    index("payment_attempts_pending_owner_idx").on(table.pendingOwnerId),
  ],
);

export const providerEvents = privateSchema.table(
  "provider_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(),
    providerEnvironment: text("provider_environment").notNull(),
    providerEventId: text("provider_event_id").notNull(),
    providerEventType: text("provider_event_type").notNull(),
    signatureStatus: text("signature_status").notNull(),
    rawBodyDigest: text("raw_body_digest").notNull(),
    rawPayloadEncrypted: text("raw_payload_encrypted"),
    providerCreatedAt: timestamp("provider_created_at", {
      withTimezone: true,
      mode: "date",
    }),
    receivedAt: timestamp("received_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
    processingState: text("processing_state").notNull(),
    normalizedEventType: text("normalized_event_type"),
    paymentAttemptId: uuid("payment_attempt_id").references(
      () => paymentAttempts.id,
      { onDelete: "restrict" },
    ),
    providerPaymentId: text("provider_payment_id"),
    semanticErrorCode: text("semantic_error_code"),
    processedAt: timestamp("processed_at", {
      withTimezone: true,
      mode: "date",
    }),
    lastErrorCode: text("last_error_code"),
    attemptCount: integer("attempt_count").default(0).notNull(),
  },
  (table) => [
    unique("provider_events_identity_unique").on(
      table.provider,
      table.providerEnvironment,
      table.providerEventId,
    ),
    check(
      "provider_events_signature_status_valid",
      sql`${table.signatureStatus} in ('verified', 'invalid', 'not_checked')`,
    ),
    check(
      "provider_events_processing_state_valid",
      sql`${table.processingState} in ('received', 'processing', 'processed', 'quarantined', 'failed_retryable')`,
    ),
    check(
      "provider_events_attempt_count_nonnegative",
      sql`${table.attemptCount} >= 0`,
    ),
    index("provider_events_attempt_received_idx").on(
      table.paymentAttemptId,
      table.receivedAt.desc(),
    ),
    index("provider_events_processing_received_idx").on(
      table.processingState,
      table.receivedAt,
    ),
  ],
);

export const providerPayments = privateSchema.table(
  "provider_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(),
    providerEnvironment: text("provider_environment").notNull(),
    providerPaymentId: text("provider_payment_id").notNull(),
    providerOrderId: text("provider_order_id").notNull(),
    paymentAttemptId: uuid("payment_attempt_id").references(
      () => paymentAttempts.id,
      { onDelete: "restrict" },
    ),
    amountPaise: bigint("amount_paise", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull(),
    paymentMethodFamily: text("payment_method_family"),
    providerCreatedAt: timestamp("provider_created_at", {
      withTimezone: true,
      mode: "date",
    }),
    providerUpdatedAt: timestamp("provider_updated_at", {
      withTimezone: true,
      mode: "date",
    }),
    firstSeenAt: timestamp("first_seen_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp("last_seen_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
    settledAt: timestamp("settled_at", {
      withTimezone: true,
      mode: "date",
    }),
    fulfilledLedgerEntryId: uuid("fulfilled_ledger_entry_id"),
    rawSnapshotEncrypted: text("raw_snapshot_encrypted"),
  },
  (table) => [
    unique("provider_payments_identity_unique").on(
      table.provider,
      table.providerEnvironment,
      table.providerPaymentId,
    ),
    uniqueIndex("provider_payments_fulfilled_ledger_unique")
      .on(table.fulfilledLedgerEntryId)
      .where(sql`${table.fulfilledLedgerEntryId} is not null`),
    check(
      "provider_payments_amount_valid",
      sql`${table.amountPaise} > 0 and ${table.amountPaise} % 100 = 0`,
    ),
    check(
      "provider_payments_currency_valid",
      sql`char_length(${table.currency}) = 3`,
    ),
    index("provider_payments_order_idx").on(
      table.provider,
      table.providerEnvironment,
      table.providerOrderId,
    ),
    index("provider_payments_attempt_idx").on(table.paymentAttemptId),
  ],
);

export const providerAdjustments = privateSchema.table(
  "provider_adjustments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(),
    providerEnvironment: text("provider_environment").notNull(),
    providerAdjustmentId: text("provider_adjustment_id").notNull(),
    providerPaymentId: text("provider_payment_id").notNull(),
    paymentAttemptId: uuid("payment_attempt_id").references(
      () => paymentAttempts.id,
      { onDelete: "restrict" },
    ),
    listingId: uuid("listing_id").references(() => listings.id, {
      onDelete: "restrict",
    }),
    kind: text("kind").notNull(),
    status: text("status").notNull(),
    amountPaise: bigint("amount_paise", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull(),
    desiredEffectiveDelta: bigint("desired_effective_delta", {
      mode: "bigint",
    }).notNull(),
    currentlyAppliedDelta: bigint("currently_applied_delta", {
      mode: "bigint",
    })
      .default(sql`0`)
      .notNull(),
    appliesToLedgerEntryId: uuid("applies_to_ledger_entry_id"),
    rankEffectEligible: boolean("rank_effect_eligible")
      .default(false)
      .notNull(),
    providerCreatedAt: timestamp("provider_created_at", {
      withTimezone: true,
      mode: "date",
    }),
    providerUpdatedAt: timestamp("provider_updated_at", {
      withTimezone: true,
      mode: "date",
    }),
    firstSeenAt: timestamp("first_seen_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp("last_seen_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("provider_adjustments_identity_unique").on(
      table.provider,
      table.providerEnvironment,
      table.providerAdjustmentId,
    ),
    check(
      "provider_adjustments_kind_valid",
      sql`${table.kind} in ('refund', 'chargeback', 'reversal', 'correction')`,
    ),
    check(
      "provider_adjustments_amount_valid",
      sql`${table.amountPaise} > 0 and ${table.amountPaise} % 100 = 0`,
    ),
    check(
      "provider_adjustments_delta_valid",
      sql`${table.desiredEffectiveDelta} in (0, -${table.amountPaise}) and ${table.currentlyAppliedDelta} <= 0 and ${table.currentlyAppliedDelta} >= -${table.amountPaise} and ${table.currentlyAppliedDelta} % 100 = 0`,
    ),
    check(
      "provider_adjustments_currency_valid",
      sql`char_length(${table.currency}) = 3`,
    ),
    index("provider_adjustments_payment_idx").on(
      table.provider,
      table.providerEnvironment,
      table.providerPaymentId,
    ),
    index("provider_adjustments_attempt_idx").on(table.paymentAttemptId),
    index("provider_adjustments_listing_idx").on(table.listingId),
    index("provider_adjustments_applies_ledger_idx").on(
      table.appliesToLedgerEntryId,
    ),
  ],
);

export const financialLedger = privateSchema.table(
  "financial_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "restrict" }),
    entryType: text("entry_type").notNull(),
    amountDeltaPaise: bigint("amount_delta_paise", {
      mode: "bigint",
    }).notNull(),
    currency: text("currency").notNull(),
    paymentAttemptId: uuid("payment_attempt_id").references(
      () => paymentAttempts.id,
      { onDelete: "restrict" },
    ),
    providerPaymentId: text("provider_payment_id"),
    providerAdjustmentId: text("provider_adjustment_id"),
    reversesLedgerEntryId: uuid("reverses_ledger_entry_id"),
    policyVersion: text("policy_version").notNull(),
    appliedAt: timestamp("applied_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    appliedBusinessDate: date("applied_business_date", {
      mode: "string",
    }).notNull(),
    providerEffectiveAt: timestamp("provider_effective_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdByAdminUserId: uuid("created_by_admin_user_id"),
    reasonCode: text("reason_code"),
    sourceKey: text("source_key").notNull(),
    sourceProvider: text("source_provider"),
    sourceEnvironment: text("source_environment"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    unique("financial_ledger_source_key_unique").on(table.sourceKey),
    uniqueIndex("financial_ledger_positive_fulfilment_unique")
      .on(table.paymentAttemptId)
      .where(sql`${table.entryType} in ('initial_sponsorship', 'raise')`),
    check(
      "financial_ledger_entry_type_valid",
      sql`${table.entryType} in ('initial_sponsorship', 'raise', 'refund', 'chargeback', 'refund_restoration', 'chargeback_restoration', 'admin_financial_correction')`,
    ),
    check(
      "financial_ledger_amount_valid",
      sql`${table.amountDeltaPaise} <> 0 and ${table.amountDeltaPaise} % 100 = 0`,
    ),
    check("financial_ledger_currency_inr", sql`${table.currency} = 'INR'`),
    check(
      "financial_ledger_entry_sign_valid",
      sql`(${table.entryType} in ('initial_sponsorship', 'raise', 'refund_restoration', 'chargeback_restoration') and ${table.amountDeltaPaise} > 0) or (${table.entryType} in ('refund', 'chargeback') and ${table.amountDeltaPaise} < 0) or ${table.entryType} = 'admin_financial_correction'`,
    ),
    check(
      "financial_ledger_fulfilment_attempt_required",
      sql`${table.entryType} not in ('initial_sponsorship', 'raise') or ${table.paymentAttemptId} is not null`,
    ),
    check(
      "financial_ledger_business_date_valid",
      sql`${table.appliedBusinessDate} = (${table.appliedAt} at time zone 'Asia/Kolkata')::date`,
    ),
    index("financial_ledger_listing_applied_idx").on(
      table.listingId,
      table.appliedAt,
      table.id,
    ),
    index("financial_ledger_listing_business_date_idx").on(
      table.listingId,
      table.appliedBusinessDate,
    ),
    index("financial_ledger_payment_attempt_idx").on(table.paymentAttemptId),
    index("financial_ledger_provider_payment_idx").on(table.providerPaymentId),
    index("financial_ledger_provider_adjustment_idx").on(
      table.providerAdjustmentId,
    ),
    index("financial_ledger_business_applied_idx").on(
      table.appliedBusinessDate,
      table.appliedAt,
    ),
    index("financial_ledger_reverses_idx").on(table.reversesLedgerEntryId),
    index("financial_ledger_created_admin_idx").on(table.createdByAdminUserId),
  ],
);

export const listingChangeRequests = privateSchema.table(
  "listing_change_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "restrict" }),
    requestedByUserId: uuid("requested_by_user_id").notNull(),
    changeType: text("change_type").notNull(),
    oldValue: jsonb("old_value").$type<Record<string, unknown>>().notNull(),
    proposedValue: jsonb("proposed_value")
      .$type<Record<string, unknown>>()
      .notNull(),
    state: text("state").notNull(),
    reviewedByAdminId: uuid("reviewed_by_admin_id"),
    reviewReason: text("review_reason"),
    createdAt: createdAt(),
    reviewedAt: timestamp("reviewed_at", {
      withTimezone: true,
      mode: "date",
    }),
  },
  (table) => [
    check(
      "listing_change_requests_state_valid",
      sql`${table.state} in ('pending', 'approved', 'rejected', 'cancelled')`,
    ),
    uniqueIndex("listing_change_requests_one_pending_type")
      .on(table.listingId, table.changeType)
      .where(sql`${table.state} = 'pending'`),
    index("listing_change_requests_state_created_idx").on(
      table.state,
      table.createdAt,
    ),
    index("listing_change_requests_requester_idx").on(table.requestedByUserId),
    index("listing_change_requests_reviewer_idx").on(table.reviewedByAdminId),
  ],
);

export const reports = privateSchema.table(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "restrict" }),
    reasonCategory: text("reason_category").notNull(),
    explanation: text("explanation").notNull(),
    reporterEmailEncrypted: text("reporter_email_encrypted"),
    reporterEmailHash: text("reporter_email_hash"),
    requestFingerprint: text("request_fingerprint").notNull(),
    state: text("state").notNull(),
    turnstileResult: text("turnstile_result"),
    reviewedByAdminId: uuid("reviewed_by_admin_id"),
    createdAt: createdAt(),
    reviewedAt: timestamp("reviewed_at", {
      withTimezone: true,
      mode: "date",
    }),
  },
  (table) => [
    unique("reports_public_id_unique").on(table.publicId),
    check(
      "reports_reason_category_valid",
      sql`${table.reasonCategory} in ('harmful_illegal', 'impersonation', 'scam', 'malware_phishing', 'adult', 'ip_counterfeit', 'other')`,
    ),
    check(
      "reports_state_valid",
      sql`${table.state} in ('pending', 'reviewing', 'resolved', 'dismissed')`,
    ),
    index("reports_listing_created_idx").on(
      table.listingId,
      table.createdAt.desc(),
    ),
    index("reports_state_created_idx").on(table.state, table.createdAt),
    index("reports_reviewer_idx").on(table.reviewedByAdminId),
  ],
);

export const adminUsers = privateSchema.table(
  "admin_users",
  {
    userId: uuid("user_id").primaryKey(),
    role: text("role").notNull(),
    isActive: boolean("is_active").notNull(),
    createdAt: createdAt(),
    createdBy: uuid("created_by"),
    revokedAt: timestamp("revoked_at", {
      withTimezone: true,
      mode: "date",
    }),
  },
  (table) => [
    check(
      "admin_users_role_valid",
      sql`${table.role} in ('reviewer', 'operations', 'super_admin')`,
    ),
    index("admin_users_created_by_idx").on(table.createdBy),
  ],
);

export const moderationActions = privateSchema.table(
  "moderation_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "restrict" }),
    actionType: text("action_type").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    reasonCode: text("reason_code").notNull(),
    publicReason: text("public_reason"),
    internalNote: text("internal_note"),
    adminUserId: uuid("admin_user_id").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index("moderation_actions_listing_created_idx").on(
      table.listingId,
      table.createdAt.desc(),
    ),
    index("moderation_actions_admin_user_idx").on(table.adminUserId),
  ],
);

export const adminAuditEvents = privateSchema.table(
  "admin_audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id").notNull(),
    actorRole: text("actor_role").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    requestId: text("request_id").notNull(),
    reason: text("reason"),
    beforeSnapshot: jsonb("before_snapshot").$type<Record<string, unknown>>(),
    afterSnapshot: jsonb("after_snapshot").$type<Record<string, unknown>>(),
    ipHmac: text("ip_hmac"),
    userAgentSummary: text("user_agent_summary"),
    createdAt: createdAt(),
  },
  (table) => [
    unique("admin_audit_events_request_action_target_unique").on(
      table.requestId,
      table.action,
      table.targetType,
      table.targetId,
    ),
    index("admin_audit_events_target_created_idx").on(
      table.targetType,
      table.targetId,
      table.createdAt.desc(),
    ),
    index("admin_audit_events_actor_created_idx").on(
      table.actorUserId,
      table.createdAt.desc(),
    ),
  ],
);

export const listingScreenings = privateSchema.table(
  "listing_screenings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "restrict" }),
    screeningVersion: text("screening_version").notNull(),
    result: text("result").notNull(),
    resultCodes: jsonb("result_codes").$type<string[]>().notNull(),
    requestFingerprint: text("request_fingerprint"),
    screenedAt: timestamp("screened_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    check(
      "listing_screenings_result_valid",
      sql`${table.result} in ('clear', 'pending_review', 'rejected')`,
    ),
    index("listing_screenings_listing_screened_idx").on(
      table.listingId,
      table.screenedAt.desc(),
    ),
  ],
);

export const clickDedupe = privateSchema.table(
  "click_dedupe",
  {
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "restrict" }),
    businessDate: date("business_date", { mode: "string" }).notNull(),
    visitorHmac: text("visitor_hmac").notNull(),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.listingId, table.businessDate, table.visitorHmac],
    }),
    check(
      "click_dedupe_expiry_after_creation",
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
    index("click_dedupe_expiry_idx").on(table.expiresAt),
  ],
);

export const emailOutbox = privateSchema.table(
  "email_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull(),
    recipientEncrypted: text("recipient_encrypted").notNull(),
    recipientHash: text("recipient_hash").notNull(),
    templateVersion: text("template_version").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    state: text("state").notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    nextAttemptAt: timestamp("next_attempt_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    providerMessageId: text("provider_message_id"),
    lastErrorCode: text("last_error_code"),
    createdAt: createdAt(),
    sentAt: timestamp("sent_at", {
      withTimezone: true,
      mode: "date",
    }),
  },
  (table) => [
    unique("email_outbox_idempotency_key_unique").on(table.idempotencyKey),
    check(
      "email_outbox_state_valid",
      sql`${table.state} in ('pending', 'sending', 'sent', 'failed_retryable', 'dead_letter')`,
    ),
    check(
      "email_outbox_attempt_count_nonnegative",
      sql`${table.attemptCount} >= 0`,
    ),
    index("email_outbox_delivery_idx").on(table.state, table.nextAttemptAt),
  ],
);

export const rateLimitBuckets = privateSchema.table(
  "rate_limit_buckets",
  {
    scope: text("scope").notNull(),
    subjectHmac: text("subject_hmac").notNull(),
    windowStart: timestamp("window_start", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    count: bigint("count", { mode: "bigint" })
      .default(sql`0`)
      .notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.scope, table.subjectHmac, table.windowStart],
    }),
    check("rate_limit_buckets_count_positive", sql`${table.count} > 0`),
    check(
      "rate_limit_buckets_expiry_valid",
      sql`${table.expiresAt} > ${table.windowStart}`,
    ),
    index("rate_limit_buckets_expiry_idx").on(table.expiresAt),
  ],
);

export const operationalFlags = privateSchema.table(
  "operational_flags",
  {
    key: text("key").primaryKey(),
    value: jsonb("value").$type<Record<string, unknown>>().notNull(),
    updatedBy: uuid("updated_by"),
    updatedAt: updatedAt(),
  },
  (table) => [index("operational_flags_updated_by_idx").on(table.updatedBy)],
);

export const reconciliationRuns = privateSchema.table(
  "reconciliation_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(),
    environment: text("environment").notNull(),
    kind: text("kind").notNull(),
    windowStart: timestamp("window_start", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    windowEnd: timestamp("window_end", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    state: text("state").notNull(),
    startedAt: timestamp("started_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "date",
    }),
    counts: jsonb("counts").$type<Record<string, bigint | string>>().notNull(),
    errorSummary: text("error_summary"),
  },
  (table) => [
    check(
      "reconciliation_runs_window_valid",
      sql`${table.windowEnd} >= ${table.windowStart}`,
    ),
    check(
      "reconciliation_runs_state_valid",
      sql`${table.state} in ('running', 'completed', 'failed')`,
    ),
    index("reconciliation_runs_provider_started_idx").on(
      table.provider,
      table.environment,
      table.startedAt.desc(),
    ),
  ],
);

export const reconciliationItems = privateSchema.table(
  "reconciliation_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => reconciliationRuns.id, { onDelete: "restrict" }),
    providerObjectType: text("provider_object_type").notNull(),
    providerObjectId: text("provider_object_id").notNull(),
    paymentAttemptId: uuid("payment_attempt_id").references(
      () => paymentAttempts.id,
      { onDelete: "restrict" },
    ),
    listingId: uuid("listing_id").references(() => listings.id, {
      onDelete: "restrict",
    }),
    discrepancyType: text("discrepancy_type").notNull(),
    expected: jsonb("expected").$type<Record<string, unknown>>(),
    actual: jsonb("actual").$type<Record<string, unknown>>(),
    state: text("state").notNull(),
    resolution: text("resolution"),
    createdAt: createdAt(),
    resolvedAt: timestamp("resolved_at", {
      withTimezone: true,
      mode: "date",
    }),
    resolvedBy: uuid("resolved_by"),
  },
  (table) => [
    unique("reconciliation_items_run_object_discrepancy_unique").on(
      table.runId,
      table.providerObjectType,
      table.providerObjectId,
      table.discrepancyType,
    ),
    check(
      "reconciliation_items_state_valid",
      sql`${table.state} in ('open', 'investigating', 'resolved', 'ignored')`,
    ),
    index("reconciliation_items_state_created_idx").on(
      table.state,
      table.createdAt,
    ),
    index("reconciliation_items_attempt_idx").on(table.paymentAttemptId),
    index("reconciliation_items_listing_idx").on(table.listingId),
    index("reconciliation_items_resolved_by_idx").on(table.resolvedBy),
  ],
);

export type PaymentAttemptRow = typeof paymentAttempts.$inferSelect;
export type FinancialLedgerRow = typeof financialLedger.$inferSelect;
