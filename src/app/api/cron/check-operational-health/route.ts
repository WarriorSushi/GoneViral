import { readServerEnv } from "@/config/env/server";
import {
  collectOperationalMetrics,
  evaluateOperationalHealth,
} from "@/server/operations/metrics";
import { captureOperationalAlert } from "@/server/telemetry/alerts";
import { logger } from "@/server/telemetry/logger";
import {
  correlationHeaders,
  requestCorrelationId,
} from "@/server/telemetry/request-context";

export const maxDuration = 30;

export async function GET(request: Request) {
  const requestId = requestCorrelationId(request);
  const secret = readServerEnv().CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json(
      { error: "unauthorized" },
      { headers: correlationHeaders(requestId), status: 401 },
    );
  }
  try {
    const metrics = await collectOperationalMetrics();
    const alerts = evaluateOperationalHealth(metrics);
    await Promise.all(
      alerts.map((alert) => captureOperationalAlert(alert, requestId)),
    );
    logger.info("operational_health_checked", {
      alertCount: alerts.length,
      requestId,
    });
    return Response.json(
      { alerts, metrics, status: alerts.length === 0 ? "ok" : "attention" },
      { headers: correlationHeaders(requestId) },
    );
  } catch (error) {
    logger.error("operational_health_failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      requestId,
    });
    return Response.json(
      { status: "retry" },
      { headers: correlationHeaders(requestId), status: 503 },
    );
  }
}
