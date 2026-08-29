import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const sentry = vi.hoisted(() => ({
  captureMessage: vi.fn(),
  flush: vi.fn(),
  init: vi.fn(),
  isInitialized: vi.fn(),
  scope: {
    setExtra: vi.fn(),
    setTag: vi.fn(),
  },
  withScope: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => sentry);
vi.mock("@/server/telemetry/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { captureOperationalAlert } from "@/server/telemetry/alerts";
import { initializeSentryServer } from "@/server/telemetry/sentry";

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  sentry.isInitialized.mockReturnValue(false);
  sentry.flush.mockResolvedValue(true);
  sentry.withScope.mockImplementation((callback) => callback(sentry.scope));
});

describe("server Sentry initialization", () => {
  it("stays disabled when no DSN is configured", () => {
    initializeSentryServer();

    expect(sentry.init).not.toHaveBeenCalled();
  });

  it("initializes an unconfigured runtime with privacy-safe defaults", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://public@example.test/1");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");

    initializeSentryServer();

    expect(sentry.init).toHaveBeenCalledOnce();
    const options = sentry.init.mock.calls[0]?.[0];
    expect(options).toMatchObject({
      dsn: "https://public@example.test/1",
      enabled: true,
      environment: "preview",
      sendDefaultPii: false,
      tracesSampleRate: 0.1,
    });
    expect(
      options.beforeSend({ user: { email: "owner@example.test" } }),
    ).toEqual({ user: { email: "[REDACTED]" } });
  });

  it("does not replace an existing SDK client", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://public@example.test/1");
    sentry.isInitialized.mockReturnValue(true);

    initializeSentryServer();

    expect(sentry.init).not.toHaveBeenCalled();
  });
});

describe("operational Sentry alerts", () => {
  it("initializes, captures safe context, and flushes before returning", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://public@example.test/1");

    await captureOperationalAlert(
      { code: "payment_attempt_stale", severity: "warning", value: "1" },
      "request-safe",
    );

    expect(sentry.init).toHaveBeenCalledOnce();
    expect(sentry.scope.setTag).toHaveBeenCalledWith(
      "operational.alert_code",
      "payment_attempt_stale",
    );
    expect(sentry.captureMessage).toHaveBeenCalledWith(
      "operational_alert:payment_attempt_stale",
      "warning",
    );
    expect(sentry.flush).toHaveBeenCalledWith(2_000);
  });
});
