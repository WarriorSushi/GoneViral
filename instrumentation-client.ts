import * as Sentry from "@sentry/nextjs";

import { scrubTelemetryEvent } from "@/lib/telemetry/scrub";

Sentry.init({
  beforeBreadcrumb: (breadcrumb) => scrubTelemetryEvent(breadcrumb),
  beforeSend: (event) => scrubTelemetryEvent(event),
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NODE_ENV,
  maxBreadcrumbs: 20,
  replaysOnErrorSampleRate: 0,
  replaysSessionSampleRate: 0,
  sendDefaultPii: false,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
