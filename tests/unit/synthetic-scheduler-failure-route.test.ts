import { createHash } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const sentry = vi.hoisted(() => ({
  captureException: vi.fn(),
  flush: vi.fn(),
  scope: { setLevel: vi.fn(), setTag: vi.fn() },
  withScope: vi.fn(),
}));

vi.mock("@/server/telemetry/sentry", () => ({
  initializeSentryServer: () => sentry,
}));
vi.mock("@/server/telemetry/logger", () => ({
  logger: { error: vi.fn() },
}));

import { POST } from "@/app/api/internal/synthetic-scheduler-failure/route";

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  sentry.flush.mockResolvedValue(true);
  sentry.withScope.mockImplementation((callback) => callback(sentry.scope));
});

describe("synthetic scheduler failure endpoint", () => {
  it("looks absent and emits no telemetry without the one-time token", async () => {
    const response = await POST(
      new Request(
        "https://goneviral.in/api/internal/synthetic-scheduler-failure",
        { method: "POST" },
      ),
    );

    expect(response.status).toBe(404);
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it("emits one fixed Sentry failure, flushes, and deliberately returns 503", async () => {
    const token = "unit-test-only-certification-token";
    vi.stubEnv(
      "SYNTHETIC_CERTIFICATION_TOKEN_SHA256",
      createHash("sha256").update(token).digest("hex"),
    );
    const response = await POST(
      new Request(
        "https://goneviral.in/api/internal/synthetic-scheduler-failure",
        {
          headers: {
            "x-goneviral-synthetic-certification": token,
          },
          method: "POST",
        },
      ),
    );

    expect(response.status).toBe(503);
    expect(sentry.captureException).toHaveBeenCalledOnce();
    expect(sentry.flush).toHaveBeenCalledWith(5_000);
    expect(sentry.scope.setTag).toHaveBeenCalledWith(
      "certification.synthetic_scheduler_failure",
      "true",
    );
  });
});
