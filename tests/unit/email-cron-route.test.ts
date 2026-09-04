import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/config/env/server", () => ({
  readServerEnv: () => ({ CRON_SECRET: "phase12-cron-secret" }),
}));
vi.mock("@/server/email/outbox", () => ({ drainEmailOutbox: vi.fn() }));
const { finishMonitor, startEmailOutboxCronMonitor } = vi.hoisted(() => ({
  finishMonitor: vi.fn(),
  startEmailOutboxCronMonitor: vi.fn(),
}));
vi.mock("@/server/telemetry/cron-monitor", () => ({
  startEmailOutboxCronMonitor,
}));

import { GET } from "@/app/api/cron/drain-email-outbox/route";
import { drainEmailOutbox } from "@/server/email/outbox";

beforeEach(() => {
  vi.clearAllMocks();
  startEmailOutboxCronMonitor.mockReturnValue(finishMonitor);
});

describe("email outbox cron", () => {
  it("rejects unauthenticated drains", async () => {
    const response = await GET(
      new Request("https://goneviral.in/api/cron/drain-email-outbox"),
    );
    expect(response.status).toBe(401);
    expect(drainEmailOutbox).not.toHaveBeenCalled();
    expect(startEmailOutboxCronMonitor).not.toHaveBeenCalled();
  });

  it("returns only aggregate worker counts", async () => {
    vi.mocked(drainEmailOutbox).mockResolvedValue({
      claimed: 2,
      deadLetter: 0,
      retryable: 1,
      sent: 1,
    });
    const response = await GET(
      new Request("https://goneviral.in/api/cron/drain-email-outbox", {
        headers: { authorization: "Bearer phase12-cron-secret" },
      }),
    );
    expect(response.status).toBe(200);
    expect(finishMonitor).toHaveBeenCalledWith("ok");
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual({
      claimed: 2,
      deadLetter: 0,
      retryable: 1,
      sent: 1,
    });
  });

  it("reports an authenticated drain failure to the independent monitor", async () => {
    vi.mocked(drainEmailOutbox).mockRejectedValueOnce(
      new Error("database unavailable"),
    );
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const response = await GET(
      new Request("https://goneviral.in/api/cron/drain-email-outbox", {
        headers: { authorization: "Bearer phase12-cron-secret" },
      }),
    );

    expect(response.status).toBe(503);
    expect(finishMonitor).toHaveBeenCalledWith("error");
    error.mockRestore();
  });
});
