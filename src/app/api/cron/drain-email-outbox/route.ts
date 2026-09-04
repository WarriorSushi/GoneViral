import { readServerEnv } from "@/config/env/server";
import { drainEmailOutbox } from "@/server/email/outbox";
import { logger } from "@/server/telemetry/logger";
import { startEmailOutboxCronMonitor } from "@/server/telemetry/cron-monitor";
import {
  correlationHeaders,
  requestCorrelationId,
} from "@/server/telemetry/request-context";

export async function GET(request: Request) {
  const requestId = requestCorrelationId(request);
  const secret = readServerEnv().CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json(
      { error: "unauthorized" },
      { headers: correlationHeaders(requestId), status: 401 },
    );
  }
  const finishMonitor = startEmailOutboxCronMonitor();
  try {
    const result = await drainEmailOutbox();
    await finishMonitor("ok");
    logger.info("email_outbox_drained", { ...result, requestId });
    return Response.json(result, { headers: correlationHeaders(requestId) });
  } catch (error) {
    await finishMonitor("error");
    logger.error("email_outbox_drain_failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      requestId,
    });
    return Response.json(
      { status: "retry" },
      { headers: correlationHeaders(requestId), status: 503 },
    );
  }
}
