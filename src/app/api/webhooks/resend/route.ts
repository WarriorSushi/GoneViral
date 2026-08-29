import {
  processResendDeliveryEvent,
  verifyResendWebhook,
} from "@/server/email/resend-webhook";
import { logger } from "@/server/telemetry/logger";
import {
  correlationHeaders,
  requestCorrelationId,
} from "@/server/telemetry/request-context";

export async function POST(request: Request) {
  const requestId = requestCorrelationId(request);
  const rawBody = await request.text();
  let event;
  try {
    event = verifyResendWebhook(rawBody, request.headers);
  } catch {
    logger.warn("email_webhook_authentication_rejected", { requestId });
    return Response.json(
      { error: "invalid_webhook" },
      { headers: correlationHeaders(requestId), status: 400 },
    );
  }
  try {
    const result = await processResendDeliveryEvent(event);
    logger.info("email_delivery_event_processed", {
      outcome: result.kind,
      requestId,
    });
    return Response.json(result, {
      headers: correlationHeaders(requestId),
    });
  } catch (error) {
    logger.error("email_delivery_event_failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      requestId,
    });
    return Response.json(
      { status: "retry" },
      { headers: correlationHeaders(requestId), status: 503 },
    );
  }
}
