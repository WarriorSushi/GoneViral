import { readServerEnv } from "@/config/env/server";
import { revalidatePaymentResult } from "@/server/cache/revalidate-payment-result";
import { runPaymentReconciliation } from "@/server/payments/reconciliation";
import { logger } from "@/server/telemetry/logger";
import {
  correlationHeaders,
  requestCorrelationId,
} from "@/server/telemetry/request-context";

export const maxDuration = 60;

export async function GET(request: Request) {
  const requestId = requestCorrelationId(request);
  const secret = readServerEnv().CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return new Response("Unauthorized", {
      headers: correlationHeaders(requestId),
      status: 401,
    });
  try {
    const summary = await runPaymentReconciliation({
      onProcessed: revalidatePaymentResult,
    });
    logger.info("reconciliation_completed", { ...summary, requestId });
    return Response.json(summary, {
      headers: correlationHeaders(requestId),
    });
  } catch (error) {
    logger.error("reconciliation_failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      requestId,
    });
    return Response.json(
      { status: "retry" },
      {
        headers: correlationHeaders(requestId),
        status: 503,
      },
    );
  }
}
