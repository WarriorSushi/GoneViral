import { readFile } from "node:fs/promises";

import { describe, expect, it, vi } from "vitest";

import {
  CONNECT_TIMEOUT_MS,
  OPERATION_ROUTES,
  SCHEDULE_OPERATIONS,
  TOTAL_TIMEOUT_MS,
  parseBaseUrl,
  runScheduledOperations,
  selectOperations,
} from "../../scripts/operations/invoke-scheduled-operations.mjs";

const workflowPath = new URL(
  "../../.github/workflows/scheduled-operations.yml",
  import.meta.url,
);

describe("scheduled operations workflow", () => {
  it("defines the exact schedules, manual choices, minimal permissions, guard, and concurrency", async () => {
    const workflow = await readFile(workflowPath, "utf8");

    expect(workflow.match(/- cron:/g)).toHaveLength(3);
    expect(workflow).toContain('- cron: "*/5 * * * *"');
    expect(workflow).toContain('- cron: "17 * * * *"');
    expect(workflow).toContain('- cron: "43 2 * * *"');
    expect(workflow).toContain("workflow_dispatch:");
    for (const operation of Object.keys(OPERATION_ROUTES)) {
      expect(workflow).toContain(`          - ${operation}`);
    }

    expect(workflow).toMatch(/permissions:\s+contents: read/);
    expect(workflow).not.toMatch(/permissions:[\s\S]*?(?:write|write-all)/);
    expect(workflow).not.toContain("pull_request_target");
    expect(workflow).toContain("group: goneviral-scheduled-operations");
    expect(workflow).toContain("cancel-in-progress: false");
    expect(workflow).toContain(
      "if: ${{ vars.GONEVIRAL_SCHEDULED_OPERATIONS_ENABLED == 'true' }}",
    );
  });

  it("pins every action and keeps the secret out of the command", async () => {
    const workflow = await readFile(workflowPath, "utf8");
    const uses = [...workflow.matchAll(/^\s*uses:\s*([^\s]+)/gm)].map(
      (match) => match[1],
    );

    expect(uses.length).toBeGreaterThan(0);
    for (const action of uses) {
      expect(action).toMatch(/^[^@\s]+@[0-9a-f]{40}$/);
    }
    expect(workflow).toContain(
      "run: node scripts/operations/invoke-scheduled-operations.mjs",
    );
    expect(workflow).not.toMatch(/run:.*(?:CRON_SECRET|secrets\.)/);
  });

  it("maps schedules and manual dispatches only to fixed routes", () => {
    expect(OPERATION_ROUTES).toEqual({
      "drain-email-outbox": "/api/cron/drain-email-outbox",
      "check-operational-health": "/api/cron/check-operational-health",
      "reconcile-payments": "/api/cron/reconcile-payments",
      "cleanup-logo-assets": "/api/cron/cleanup-logo-assets",
      "cleanup-retention": "/api/cron/cleanup-retention",
    });
    expect(selectOperations("schedule", { schedule: "*/5 * * * *" })).toEqual([
      "drain-email-outbox",
      "check-operational-health",
    ]);
    expect(selectOperations("schedule", { schedule: "17 * * * *" })).toEqual([
      "reconcile-payments",
    ]);
    expect(selectOperations("schedule", { schedule: "43 2 * * *" })).toEqual([
      "cleanup-logo-assets",
      "cleanup-retention",
    ]);

    for (const operation of Object.keys(OPERATION_ROUTES)) {
      expect(
        selectOperations("workflow_dispatch", { inputs: { operation } }),
      ).toEqual([operation]);
    }
    expect(() =>
      selectOperations("schedule", { schedule: "* * * * *" }),
    ).toThrow("unsupported_schedule");
    expect(() =>
      selectOperations("workflow_dispatch", {
        inputs: { operation: "https://attacker.example" },
      }),
    ).toThrow("unsupported_operation");

    expect(SCHEDULE_OPERATIONS).toEqual({
      "*/5 * * * *": ["drain-email-outbox", "check-operational-health"],
      "17 * * * *": ["reconcile-payments"],
      "43 2 * * *": ["cleanup-logo-assets", "cleanup-retention"],
    });
  });

  it("requires an origin-only HTTPS base URL", () => {
    expect(parseBaseUrl("https://scheduled.example").href).toBe(
      "https://scheduled.example/",
    );
    for (const invalid of [
      "http://scheduled.example",
      "https://user:pass@scheduled.example",
      "https://scheduled.example/path",
      "https://scheduled.example?next=elsewhere",
      "https://scheduled.example/#fragment",
      " https://scheduled.example",
    ]) {
      expect(() => parseBaseUrl(invalid)).toThrow("invalid_base_url");
    }
  });

  it("is disabled unless the repository guard is exactly true", async () => {
    const request = vi.fn();
    await expect(
      runScheduledOperations({
        environment: {
          CRON_SECRET: "test-only-secret",
          GONEVIRAL_SCHEDULED_OPERATIONS_BASE_URL: "https://scheduled.example",
        },
        event: { schedule: "*/5 * * * *" },
        eventName: "schedule",
        request,
      }),
    ).rejects.toThrow("scheduler_disabled");
    expect(request).not.toHaveBeenCalled();
  });

  it("constructs authenticated requests in memory with bounded timeouts and safe logs", async () => {
    const secret = "test-only-secret-never-log";
    const request = vi.fn().mockResolvedValue(204);
    const logger = { info: vi.fn(), error: vi.fn() };

    await runScheduledOperations({
      environment: {
        CRON_SECRET: secret,
        GONEVIRAL_SCHEDULED_OPERATIONS_BASE_URL: "https://scheduled.example",
        GONEVIRAL_SCHEDULED_OPERATIONS_ENABLED: "true",
      },
      event: { schedule: "*/5 * * * *" },
      eventName: "schedule",
      logger,
      request,
    });

    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        url: new URL("https://scheduled.example/api/cron/drain-email-outbox"),
        secret,
        connectTimeoutMs: CONNECT_TIMEOUT_MS,
        totalTimeoutMs: TOTAL_TIMEOUT_MS,
      }),
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        url: new URL(
          "https://scheduled.example/api/cron/check-operational-health",
        ),
      }),
    );

    const logs = logger.info.mock.calls.flat().join(" ");
    expect(logs).toContain("route=/api/cron/drain-email-outbox status=204");
    expect(logs).not.toContain(secret);
    expect(logs).not.toContain("scheduled.example");
  });

  it("fails immediately after a non-2xx response without leaking details", async () => {
    const logger = { info: vi.fn(), error: vi.fn() };
    const request = vi.fn().mockResolvedValue(503);

    await expect(
      runScheduledOperations({
        environment: {
          CRON_SECRET: "test-only-secret-never-log",
          GONEVIRAL_SCHEDULED_OPERATIONS_BASE_URL: "https://scheduled.example",
          GONEVIRAL_SCHEDULED_OPERATIONS_ENABLED: "true",
        },
        event: { inputs: { operation: "reconcile-payments" } },
        eventName: "workflow_dispatch",
        logger,
        request,
      }),
    ).rejects.toThrow("non_2xx");

    expect(logger.error).toHaveBeenCalledOnce();
    const logs = logger.error.mock.calls.flat().join(" ");
    expect(logs).toContain("route=/api/cron/reconcile-payments status=503");
    expect(logs).not.toContain("test-only-secret-never-log");
    expect(request).toHaveBeenCalledOnce();
  });
});
