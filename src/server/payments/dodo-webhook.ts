import "server-only";

import { createHash } from "node:crypto";

import DodoPayments from "dodopayments";
import { z } from "zod";

import { readServerEnv } from "@/config/env/server";

const mockWebhookSecret = `whsec_${Buffer.from(
  "goneviral-local-dodo-webhook-secret",
).toString("base64")}`;

const metadataSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean()]),
);

const paymentSchema = z.object({
  checkout_session_id: z.string().min(1).max(200).nullable().optional(),
  created_at: z.iso.datetime({ offset: true }),
  currency: z.string().length(3),
  metadata: metadataSchema,
  payment_id: z.string().min(1).max(200),
  payment_method: z.string().max(100).nullable().optional(),
  payload_type: z.literal("Payment").optional(),
  status: z.string().nullable().optional(),
  total_amount: z.number().int().positive().safe(),
  updated_at: z.iso.datetime({ offset: true }).nullable().optional(),
});

const envelopeSchema = z.object({
  business_id: z.string().min(1).max(200),
  data: z.unknown(),
  timestamp: z.iso.datetime({ offset: true }),
  type: z.string().min(1).max(200),
});

const knownPaymentEvents = new Set([
  "payment.cancelled",
  "payment.failed",
  "payment.processing",
  "payment.succeeded",
]);

const pendingStatuses = new Set([
  "processing",
  "requires_customer_action",
  "requires_merchant_action",
  "requires_payment_method",
  "requires_confirmation",
  "requires_capture",
  "partially_captured",
  "partially_captured_and_capturable",
]);

export type DodoPaymentStatus = "dropped" | "failed" | "pending" | "succeeded";

export type NormalizedDodoEvent = Readonly<{
  businessId: string;
  eventType: string;
  normalizedType: "payment_status" | "unknown";
  payment: null | Readonly<{
    amountPaise: bigint;
    attemptPublicId: string | null;
    currency: string;
    orderId: string | null;
    paymentId: string;
    paymentMethod: string | null;
    providerCreatedAt: Date;
    providerStatus: string | null;
    providerUpdatedAt: Date | null;
    status: DodoPaymentStatus | null;
  }>;
  providerCreatedAt: Date;
  rawBodyDigest: string;
}>;

export function getDodoWebhookConfiguration() {
  const environment = readServerEnv();
  if (environment.DODO_PAYMENTS_ENVIRONMENT === "mock") {
    return {
      businessId: "mock_business",
      environment: "mock" as const,
      secret: mockWebhookSecret,
    };
  }
  return {
    businessId: environment.DODO_PAYMENTS_BUSINESS_ID!,
    environment: "test_mode" as const,
    secret: environment.DODO_PAYMENTS_WEBHOOK_KEY!,
  };
}

export function verifyAndNormalizeDodoWebhook(
  rawBody: string,
  headers: Headers,
): NormalizedDodoEvent {
  const configuration = getDodoWebhookConfiguration();
  const client = new DodoPayments({
    bearerToken: "webhook-verification-only",
    webhookKey: configuration.secret,
  });
  const unwrapped = client.webhooks.unwrap(rawBody, {
    headers: Object.fromEntries(headers.entries()),
  });
  const envelope = envelopeSchema.parse(unwrapped);
  const rawBodyDigest = createHash("sha256").update(rawBody).digest("hex");
  const providerCreatedAt = new Date(envelope.timestamp);

  if (!knownPaymentEvents.has(envelope.type)) {
    return {
      businessId: envelope.business_id,
      eventType: envelope.type,
      normalizedType: "unknown",
      payment: null,
      providerCreatedAt,
      rawBodyDigest,
    };
  }

  const payment = paymentSchema.parse(envelope.data);
  const status = normalizeDodoStatus(envelope.type, payment.status);
  const attemptPublicId = payment.metadata.attempt_public_id;
  return {
    businessId: envelope.business_id,
    eventType: envelope.type,
    normalizedType: "payment_status",
    payment: {
      amountPaise: BigInt(payment.total_amount),
      attemptPublicId:
        typeof attemptPublicId === "string" ? attemptPublicId : null,
      currency: payment.currency.toUpperCase(),
      orderId: payment.checkout_session_id ?? null,
      paymentId: payment.payment_id,
      paymentMethod: payment.payment_method ?? null,
      providerCreatedAt: new Date(payment.created_at),
      providerStatus: payment.status ?? null,
      providerUpdatedAt: payment.updated_at
        ? new Date(payment.updated_at)
        : null,
      status,
    },
    providerCreatedAt,
    rawBodyDigest,
  };
}

function normalizeDodoStatus(
  eventType: string,
  status: string | null | undefined,
): DodoPaymentStatus | null {
  if (eventType === "payment.succeeded" && status === "succeeded") {
    return "succeeded";
  }
  if (eventType === "payment.failed" && status === "failed") return "failed";
  if (eventType === "payment.cancelled" && status === "cancelled") {
    return "dropped";
  }
  if (
    eventType === "payment.processing" &&
    status !== null &&
    status !== undefined &&
    pendingStatuses.has(status)
  ) {
    return "pending";
  }
  return null;
}

export function getMockDodoWebhookSecretForTests(): string {
  return mockWebhookSecret;
}
