import "server-only";

import { randomBytes } from "node:crypto";

import DodoPayments from "dodopayments";
import type postgres from "postgres";

import { readServerEnv } from "@/config/env/server";
import { getSqlClient } from "@/server/db/client";
import { readOperationalFlag } from "@/server/operations/flags";

import type { AdminRequestContext, AdminOperationResult } from "./operations";
import { hasAdminPermission } from "./permissions";

type Transaction = postgres.TransactionSql<{ bigint: bigint }>;

export interface ProviderRefundExecutor {
  submit(input: {
    amountPaise: bigint;
    idempotencyKey: string;
    paymentId: string;
  }): Promise<{ providerRefundId: string }>;
}

export class DodoRefundExecutor implements ProviderRefundExecutor {
  readonly #client: DodoPayments;

  constructor(apiKey: string) {
    this.#client = new DodoPayments({
      bearerToken: apiKey,
      environment: "test_mode",
      maxRetries: 2,
      timeout: 15_000,
    });
  }

  async submit(input: {
    amountPaise: bigint;
    idempotencyKey: string;
    paymentId: string;
  }) {
    const payment = await this.#client.payments.retrieve(input.paymentId);
    if (payment.status !== "succeeded" || payment.currency !== "INR")
      throw new Error("dodo_payment_not_refundable");
    if (input.amountPaise > BigInt(payment.total_amount))
      throw new Error("dodo_refund_amount_exceeds_payment");

    const body: {
      items?: Array<{
        amount: number;
        item_id: string;
        tax_inclusive: boolean;
      }>;
      metadata: Record<string, string>;
      payment_id: string;
    } = {
      metadata: { goneviral_request_id: input.idempotencyKey },
      payment_id: input.paymentId,
    };
    if (input.amountPaise < BigInt(payment.total_amount)) {
      const lineItems = await this.#client.payments.retrieveLineItems(
        input.paymentId,
      );
      let remaining = input.amountPaise;
      body.items = [];
      for (const line of lineItems.items) {
        if (remaining === 0n) break;
        const refundable = BigInt(line.refundable_amount);
        const amount = remaining < refundable ? remaining : refundable;
        if (amount > 0n) {
          body.items.push({
            amount: Number(amount),
            item_id: line.items_id,
            tax_inclusive: true,
          });
          remaining -= amount;
        }
      }
      if (remaining !== 0n) throw new Error("dodo_refundable_amount_too_low");
    }
    const refund = await this.#client.refunds.create(body, {
      idempotencyKey: input.idempotencyKey,
    });
    return { providerRefundId: refund.refund_id };
  }
}

export class MockRefundExecutor implements ProviderRefundExecutor {
  async submit(input: { idempotencyKey: string }) {
    return {
      providerRefundId: `mock_ref_${input.idempotencyKey.slice(0, 24)}`,
    };
  }
}

export function getConfiguredRefundExecutor(): ProviderRefundExecutor {
  const environment = readServerEnv();
  return environment.DODO_PAYMENTS_ENVIRONMENT === "mock"
    ? new MockRefundExecutor()
    : new DodoRefundExecutor(environment.DODO_PAYMENTS_API_KEY!);
}

function validate(input: {
  amountPaise?: bigint;
  context: AdminRequestContext;
  reason: string;
}) {
  if (!hasAdminPermission(input.context.session.role, "payments:refund"))
    throw new Error("admin_permission_denied");
  if (
    input.context.requestId.length < 8 ||
    input.context.requestId.length > 200
  )
    throw new Error("admin_request_id_invalid");
  if (input.reason.trim().length < 12 || input.reason.trim().length > 1_000)
    throw new Error("admin_reason_invalid");
  if (
    input.amountPaise !== undefined &&
    (input.amountPaise <= 0n || input.amountPaise % 100n !== 0n)
  )
    throw new Error("admin_refund_amount_invalid");
}

async function audit(
  transaction: Transaction,
  input: {
    action: string;
    context: AdminRequestContext;
    reason: string;
    state: string;
    targetId: string;
  },
) {
  return transaction<{ id: string }[]>`
    INSERT INTO private.admin_audit_events (
      actor_user_id, actor_role, action, target_type, target_id, request_id,
      reason, after_snapshot, ip_hmac, user_agent_summary
    ) VALUES (
      ${input.context.session.userId}, ${input.context.session.role},
      ${input.action}, 'admin_refund_request', ${input.targetId},
      ${input.context.requestId}, ${input.reason.trim()},
      (${JSON.stringify({ state: input.state })}::jsonb #>> '{}')::jsonb,
      ${input.context.ipHmac ?? null},
      ${input.context.userAgentSummary?.slice(0, 240) ?? null}
    ) ON CONFLICT (request_id, action, target_type, target_id) DO NOTHING
    RETURNING id
  `;
}

export async function prepareProviderRefund(input: {
  amountPaise: bigint;
  context: AdminRequestContext;
  providerPaymentId: string;
  reason: string;
}): Promise<AdminOperationResult & { refundPublicId?: string }> {
  validate(input);
  if (!(await readOperationalFlag("provider_refunds_enabled", false)))
    return {
      kind: "rejected",
      message: "Provider refund initiation is disabled by operational policy.",
    };
  return getSqlClient().begin(async (transaction) => {
    const environment = readServerEnv().DODO_PAYMENTS_ENVIRONMENT;
    const [payment] = await transaction<
      { amount_paise: bigint; currency: string }[]
    >`
      SELECT amount_paise, currency FROM private.provider_payments
      WHERE provider = 'dodo' AND provider_environment = ${environment}
        AND provider_payment_id = ${input.providerPaymentId}
        AND status = 'succeeded'
      FOR UPDATE
    `;
    if (!payment || payment.currency !== "INR")
      return {
        kind: "rejected",
        message: "Payment is not refundable.",
      } as const;
    const [reserved] = await transaction<{ amount_paise: bigint }[]>`
      SELECT (
        COALESCE((
          SELECT sum(adjustment.amount_paise) FROM private.provider_adjustments adjustment
          WHERE adjustment.provider = 'dodo'
            AND adjustment.provider_environment = ${environment}
            AND adjustment.provider_payment_id = ${input.providerPaymentId}
            AND adjustment.kind = 'refund' AND adjustment.desired_effective_delta < 0
        ), 0) +
        COALESCE((
          SELECT sum(request.amount_paise) FROM private.admin_refund_requests request
          WHERE request.provider = 'dodo'
            AND request.provider_environment = ${environment}
            AND request.provider_payment_id = ${input.providerPaymentId}
            AND request.state IN ('prepared', 'submitting', 'submitted')
            AND NOT EXISTS (
              SELECT 1 FROM private.provider_adjustments adjustment
              WHERE adjustment.provider = request.provider
                AND adjustment.provider_environment = request.provider_environment
                AND adjustment.provider_adjustment_id = request.provider_refund_id
            )
        ), 0)
      )::bigint AS amount_paise
    `;
    if (
      (reserved?.amount_paise ?? 0n) + input.amountPaise >
      payment.amount_paise
    )
      return {
        kind: "rejected",
        message: "Requested refunds would exceed the settled payment.",
      } as const;
    const publicId = `arf_${randomBytes(18).toString("base64url")}`;
    const inserted = await transaction<{ public_id: string }[]>`
      INSERT INTO private.admin_refund_requests (
        public_id, provider, provider_environment, provider_payment_id,
        amount_paise, currency, reason, state, request_id, requested_by
      ) VALUES (
        ${publicId}, 'dodo', ${environment}, ${input.providerPaymentId},
        ${input.amountPaise}, 'INR', ${input.reason.trim()}, 'prepared',
        ${input.context.requestId}, ${input.context.session.userId}
      ) ON CONFLICT (request_id) DO NOTHING RETURNING public_id
    `;
    const existingPublicId =
      inserted[0]?.public_id ??
      (
        await transaction<{ public_id: string }[]>`
          SELECT public_id FROM private.admin_refund_requests
          WHERE request_id = ${input.context.requestId}
        `
      )[0]?.public_id;
    if (!inserted[0])
      return existingPublicId
        ? ({ kind: "duplicate", refundPublicId: existingPublicId } as const)
        : ({ kind: "duplicate" } as const);
    await audit(transaction, {
      action: "provider_refund_prepared",
      context: input.context,
      reason: input.reason,
      state: "prepared",
      targetId: publicId,
    });
    return { kind: "applied", refundPublicId: publicId } as const;
  });
}

export async function confirmProviderRefund(input: {
  context: AdminRequestContext;
  executor?: ProviderRefundExecutor;
  reason: string;
  refundPublicId: string;
}): Promise<AdminOperationResult> {
  validate(input);
  if (!(await readOperationalFlag("provider_refunds_enabled", false)))
    return {
      kind: "rejected",
      message: "Provider refund initiation is disabled by operational policy.",
    };
  const prepared = await getSqlClient().begin(async (transaction) => {
    const [request] = await transaction<
      {
        amount_paise: bigint;
        provider_payment_id: string;
        state: string;
      }[]
    >`
      SELECT amount_paise, provider_payment_id, state
      FROM private.admin_refund_requests
      WHERE public_id = ${input.refundPublicId} FOR UPDATE
    `;
    if (!request) return null;
    if (request.state === "submitted") return { duplicate: true } as const;
    if (!new Set(["prepared", "failed", "submitting"]).has(request.state))
      return null;
    const inserted = await audit(transaction, {
      action: "provider_refund_confirmed",
      context: input.context,
      reason: input.reason,
      state: "submitting",
      targetId: input.refundPublicId,
    });
    if (inserted.length === 0 && request.state !== "submitting")
      return { duplicate: true } as const;
    await transaction`
      UPDATE private.admin_refund_requests
      SET state = 'submitting', confirmed_by = ${input.context.session.userId},
          confirmed_at = COALESCE(confirmed_at, transaction_timestamp()),
          failure_code = NULL
      WHERE public_id = ${input.refundPublicId}
    `;
    return {
      amountPaise: request.amount_paise,
      duplicate: false,
      paymentId: request.provider_payment_id,
    } as const;
  });
  if (!prepared)
    return { kind: "rejected", message: "Refund request is unavailable." };
  if (prepared.duplicate) return { kind: "duplicate" };

  try {
    const result = await (
      input.executor ?? getConfiguredRefundExecutor()
    ).submit({
      amountPaise: prepared.amountPaise,
      idempotencyKey: input.refundPublicId,
      paymentId: prepared.paymentId,
    });
    await getSqlClient()`
      UPDATE private.admin_refund_requests
      SET state = 'submitted', provider_refund_id = ${result.providerRefundId},
          submitted_at = transaction_timestamp(), failure_code = NULL
      WHERE public_id = ${input.refundPublicId} AND state = 'submitting'
    `;
    return { kind: "applied" };
  } catch (error) {
    await getSqlClient()`
      UPDATE private.admin_refund_requests
      SET state = 'failed',
          failure_code = ${error instanceof Error ? error.message.slice(0, 200) : "provider_error"}
      WHERE public_id = ${input.refundPublicId} AND state = 'submitting'
    `;
    throw error;
  }
}
