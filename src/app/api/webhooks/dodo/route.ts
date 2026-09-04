import { after, NextResponse } from "next/server";

import { revalidatePaymentResult } from "@/server/cache/revalidate-payment-result";
import { deliverEmailOutboxById } from "@/server/email/outbox";
import {
  getDodoWebhookConfiguration,
  verifyAndNormalizeDodoWebhook,
} from "@/server/payments/dodo-webhook";
import { processDodoWebhook } from "@/server/payments/process-dodo-webhook";
import { logger } from "@/server/telemetry/logger";
import {
  correlationHeaders,
  requestCorrelationId,
} from "@/server/telemetry/request-context";

export const maxDuration = 15;

const MAX_WEBHOOK_BYTES = 1_000_000;

function response(
  body: Record<string, unknown>,
  requestId: string,
  status = 200,
) {
  return NextResponse.json(body, {
    headers: correlationHeaders(requestId),
    status,
  });
}

export async function handleDodoWebhook(
  request: Request,
  scheduleAfterResponse: typeof after = after,
): Promise<Response> {
  const requestId = requestCorrelationId(request);
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_WEBHOOK_BYTES) {
    return response({ status: "invalid_request" }, requestId, 413);
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return response({ status: "invalid_request" }, requestId, 400);
  }
  if (Buffer.byteLength(rawBody, "utf8") > MAX_WEBHOOK_BYTES) {
    return response({ status: "invalid_request" }, requestId, 413);
  }

  const eventId = request.headers.get("webhook-id");
  if (!eventId || eventId.length > 200) {
    return response({ status: "invalid_signature" }, requestId, 400);
  }

  let event;
  try {
    event = verifyAndNormalizeDodoWebhook(rawBody, request.headers);
  } catch {
    logger.warn("webhook_authentication_rejected", { requestId });
    return response({ status: "invalid_signature_or_payload" }, requestId, 400);
  }

  try {
    const configuration = getDodoWebhookConfiguration();
    const result = await processDodoWebhook({
      event,
      eventId,
      expectedBusinessId: configuration.businessId,
      providerEnvironment: configuration.environment,
    });

    if (result.emailOutboxId) {
      const emailOutboxId = result.emailOutboxId;
      scheduleAfterResponse(async () => {
        try {
          const delivery = await deliverEmailOutboxById(emailOutboxId);
          logger.info("payment_confirmation_email_attempted", {
            ...delivery,
            requestId,
          });
        } catch (deliveryError) {
          logger.error("payment_confirmation_email_attempt_failed", {
            errorName:
              deliveryError instanceof Error
                ? deliveryError.name
                : "UnknownError",
            requestId,
          });
        }
      });
    }

    if (result.listingPublicId) {
      try {
        revalidatePaymentResult(result);
      } catch (cacheError) {
        logger.error("payment_cache_invalidation_failed", {
          errorName:
            cacheError instanceof Error ? cacheError.name : "UnknownError",
          requestId,
        });
      }
    }

    logger.info("payment_webhook_processed", {
      outcome: result.kind,
      requestId,
      ...(result.listingPublicId
        ? { listingPublicId: result.listingPublicId }
        : {}),
    });
    return response({ status: result.kind }, requestId);
  } catch (processingError) {
    logger.error("dodo_webhook_retryable_failure", {
      errorName:
        processingError instanceof Error
          ? processingError.name
          : "UnknownError",
      requestId,
    });
    return response({ status: "retry" }, requestId, 503);
  }
}

export async function POST(request: Request) {
  return handleDodoWebhook(request);
}
