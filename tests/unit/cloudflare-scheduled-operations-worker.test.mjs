import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import worker, {
  runScheduledOperations,
  SCHEDULED_OPERATIONS,
  scheduledOperationsOrigin,
} from "../../workers/scheduled-operations/index.mjs";

const configPath = fileURLToPath(
  new URL("../../workers/scheduled-operations/wrangler.jsonc", import.meta.url),
);
const enabledEnvironment = {
  CRON_SECRET: "cron-secret-fixture",
  GONEVIRAL_SCHEDULED_OPERATIONS_BASE_URL: "https://scheduled.example",
  GONEVIRAL_SCHEDULED_OPERATIONS_ENABLED: "true",
  VERCEL_AUTOMATION_BYPASS_SECRET: "bypass-secret-fixture",
};

afterEach(() => vi.restoreAllMocks());

describe("Cloudflare scheduled-operations Worker", () => {
  it("checks in the exact inert three-trigger configuration", async () => {
    const configText = await readFile(configPath, "utf8");
    const config = JSON.parse(configText.replaceAll(/,\s*([}\]])/g, "$1"));
    expect(config.name).toBe("goneviral-scheduled-operations-staging");
    expect(config.workers_dev).toBe(false);
    expect(config.preview_urls).toBe(false);
    expect(config.triggers.crons).toEqual([
      "*/5 * * * *",
      "17 * * * *",
      "43 2 * * *",
    ]);
    expect(config.vars).toEqual({
      GONEVIRAL_SCHEDULED_OPERATIONS_BASE_URL:
        "https://goneviral-phase15-preview-warriorsushis-projects.vercel.app",
      GONEVIRAL_SCHEDULED_OPERATIONS_ENABLED: "false",
    });
    expect(JSON.stringify(config)).not.toMatch(
      /CRON_SECRET|VERCEL_AUTOMATION_BYPASS_SECRET/,
    );
  });

  it("maps only the five fixed application routes", () => {
    expect(SCHEDULED_OPERATIONS).toEqual({
      "17 * * * *": [
        {
          name: "reconcile-payments",
          route: "/api/cron/reconcile-payments",
        },
      ],
      "43 2 * * *": [
        {
          name: "cleanup-logo-assets",
          route: "/api/cron/cleanup-logo-assets",
        },
        {
          name: "cleanup-retention",
          route: "/api/cron/cleanup-retention",
        },
      ],
      "*/5 * * * *": [
        {
          name: "drain-email-outbox",
          route: "/api/cron/drain-email-outbox",
        },
        {
          name: "check-operational-health",
          route: "/api/cron/check-operational-health",
        },
      ],
    });
  });

  it("stops before reading credentials unless the guard is exact lowercase true", async () => {
    const fetchImplementation = vi.fn();
    const environment = new Proxy(
      { GONEVIRAL_SCHEDULED_OPERATIONS_ENABLED: "TRUE" },
      {
        get(target, property) {
          if (property === "CRON_SECRET") {
            throw new Error("credential_was_read");
          }
          return Reflect.get(target, property);
        },
      },
    );
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await expect(
      runScheduledOperations("*/5 * * * *", environment, fetchImplementation),
    ).resolves.toBeUndefined();
    expect(fetchImplementation).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith("scheduled_operations result=disabled");
  });

  it("requires an origin-only HTTPS base URL", () => {
    expect(scheduledOperationsOrigin("https://scheduled.example")).toBe(
      "https://scheduled.example",
    );
    expect(scheduledOperationsOrigin("https://scheduled.example/")).toBe(
      "https://scheduled.example",
    );
    for (const value of [
      "http://scheduled.example",
      "https://user@scheduled.example",
      "https://scheduled.example/path",
      "https://scheduled.example?query=1",
      "https://scheduled.example/#fragment",
      " https://scheduled.example",
    ]) {
      expect(() => scheduledOperationsOrigin(value)).toThrow(
        "scheduled_operations_configuration_invalid",
      );
    }
  });

  it("sends both credentials only as headers with bounded safe request options", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 204,
      }),
    );
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    await runScheduledOperations(
      "17 * * * *",
      enabledEnvironment,
      fetchImplementation,
    );

    expect(fetchImplementation).toHaveBeenCalledTimes(1);
    const [url, options] = fetchImplementation.mock.calls[0];
    expect(url).toBe("https://scheduled.example/api/cron/reconcile-payments");
    expect(options).toMatchObject({
      cache: "no-store",
      headers: {
        authorization: "Bearer cron-secret-fixture",
        "x-vercel-protection-bypass": "bypass-secret-fixture",
      },
      method: "GET",
      redirect: "manual",
    });
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(String(url)).not.toMatch(/cron-secret|bypass-secret/);
  });

  it("attempts both routes and fails the event after any non-2xx response", async () => {
    const fetchImplementation = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await expect(
      runScheduledOperations(
        "43 2 * * *",
        enabledEnvironment,
        fetchImplementation,
      ),
    ).rejects.toThrow("scheduled_operations_request_failed");
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
    expect(error).toHaveBeenCalledWith(
      expect.stringMatching(
        /^scheduled_operation operation=cleanup-logo-assets status=503 duration_ms=\d+ result=http_failure$/,
      ),
    );
    expect(info).toHaveBeenCalledWith(
      expect.stringMatching(
        /^scheduled_operation operation=cleanup-retention status=204 duration_ms=\d+ result=ok$/,
      ),
    );
  });

  it("fails closed for unknown schedules or missing configuration", async () => {
    const fetchImplementation = vi.fn();
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    await expect(
      runScheduledOperations(
        "0 0 * * *",
        enabledEnvironment,
        fetchImplementation,
      ),
    ).rejects.toThrow("scheduled_operations_schedule_unknown");
    await expect(
      runScheduledOperations(
        "17 * * * *",
        { ...enabledEnvironment, CRON_SECRET: "" },
        fetchImplementation,
      ),
    ).rejects.toThrow("scheduled_operations_configuration_invalid");
    expect(fetchImplementation).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(
      "scheduled_operations result=configuration_invalid",
    );
  });

  it("does not expose a public fetch handler or leak secrets through logs", async () => {
    expect(worker).not.toHaveProperty("fetch");
    const secretText = `${enabledEnvironment.CRON_SECRET}:${enabledEnvironment.VERCEL_AUTOMATION_BYPASS_SECRET}`;
    const fetchImplementation = vi
      .fn()
      .mockRejectedValue(new Error(secretText));
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await expect(
      runScheduledOperations(
        "17 * * * *",
        enabledEnvironment,
        fetchImplementation,
      ),
    ).rejects.toThrow("scheduled_operations_request_failed");
    const logged = JSON.stringify(error.mock.calls);
    expect(logged).not.toContain(enabledEnvironment.CRON_SECRET);
    expect(logged).not.toContain(
      enabledEnvironment.VERCEL_AUTOMATION_BYPASS_SECRET,
    );
    expect(logged).not.toContain(secretText);
    expect(logged).toMatch(/result=network_failure/);
  });
});
