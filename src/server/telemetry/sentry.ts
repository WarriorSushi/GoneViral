import "server-only";

import * as Sentry from "@sentry/nextjs";

import { scrubTelemetryEvent } from "@/lib/telemetry/scrub";

export function initializeSentryServer() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!Sentry.isInitialized() && dsn) {
    Sentry.init({
      beforeBreadcrumb: (breadcrumb) => scrubTelemetryEvent(breadcrumb),
      beforeSend: (event) => scrubTelemetryEvent(event),
      dsn,
      enabled: true,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
      maxBreadcrumbs: 30,
      sendDefaultPii: false,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
    });
  }

  return Sentry;
}
