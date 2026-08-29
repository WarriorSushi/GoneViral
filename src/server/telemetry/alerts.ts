import "server-only";

import type { OperationalAlert } from "@/server/operations/metrics";

import { logger } from "./logger";

export async function captureOperationalAlert(
  alert: OperationalAlert,
  requestId: string,
) {
  logger.warn("operational_alert", {
    alertCode: alert.code,
    requestId,
    severity: alert.severity,
    value: alert.value,
  });
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.withScope((scope) => {
    scope.setTag("operational.alert_code", alert.code);
    scope.setTag("operational.severity", alert.severity);
    scope.setExtra("requestId", requestId);
    scope.setExtra("value", alert.value);
    Sentry.captureMessage(
      `operational_alert:${alert.code}`,
      alert.severity === "critical" ? "error" : "warning",
    );
  });
}
