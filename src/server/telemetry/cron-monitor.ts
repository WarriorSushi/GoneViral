import "server-only";

import { logger } from "./logger";
import { initializeSentryServer } from "./sentry";

const EMAIL_OUTBOX_MONITOR_SLUG = "goneviral-email-outbox";
const EMAIL_OUTBOX_MONITOR_CONFIG = {
  checkinMargin: 3,
  failureIssueThreshold: 1,
  maxRuntime: 1,
  recoveryThreshold: 2,
  schedule: { type: "crontab", value: "* * * * *" },
  timezone: "Etc/UTC",
} as const;

export function startEmailOutboxCronMonitor() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return async (status: "error" | "ok") => {
      void status;
    };
  }

  const startedAt = Date.now();
  try {
    const Sentry = initializeSentryServer();
    const checkInId = Sentry.captureCheckIn(
      { monitorSlug: EMAIL_OUTBOX_MONITOR_SLUG, status: "in_progress" },
      EMAIL_OUTBOX_MONITOR_CONFIG,
    );

    return async (status: "error" | "ok") => {
      try {
        Sentry.captureCheckIn(
          {
            checkInId,
            duration: Math.max(0, (Date.now() - startedAt) / 1_000),
            monitorSlug: EMAIL_OUTBOX_MONITOR_SLUG,
            status,
          },
          EMAIL_OUTBOX_MONITOR_CONFIG,
        );
        await Sentry.flush(2_000);
      } catch (error) {
        logger.error("email_outbox_monitor_completion_failed", {
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
      }
    };
  } catch (error) {
    logger.error("email_outbox_monitor_start_failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return async (status: "error" | "ok") => {
      void status;
    };
  }
}
