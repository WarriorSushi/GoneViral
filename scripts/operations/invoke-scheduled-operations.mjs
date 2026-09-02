import { readFile } from "node:fs/promises";
import https from "node:https";
import { pathToFileURL } from "node:url";

export const OPERATION_ROUTES = Object.freeze({
  "drain-email-outbox": "/api/cron/drain-email-outbox",
  "check-operational-health": "/api/cron/check-operational-health",
  "reconcile-payments": "/api/cron/reconcile-payments",
  "cleanup-logo-assets": "/api/cron/cleanup-logo-assets",
  "cleanup-retention": "/api/cron/cleanup-retention",
});

export const SCHEDULE_OPERATIONS = Object.freeze({
  "*/5 * * * *": Object.freeze([
    "drain-email-outbox",
    "check-operational-health",
  ]),
  "17 * * * *": Object.freeze(["reconcile-payments"]),
  "43 2 * * *": Object.freeze(["cleanup-logo-assets", "cleanup-retention"]),
});

export const CONNECT_TIMEOUT_MS = 10_000;
export const TOTAL_TIMEOUT_MS = 45_000;

class SafeInvocationError extends Error {
  constructor(code, status = "failed") {
    super(code);
    this.name = "SafeInvocationError";
    this.code = code;
    this.status = status;
  }
}

function safeFailure(error) {
  if (error instanceof SafeInvocationError) return error;
  return new SafeInvocationError("request_failed");
}

export function parseBaseUrl(input) {
  if (!input || input !== input.trim()) {
    throw new SafeInvocationError("invalid_base_url");
  }

  let baseUrl;
  try {
    baseUrl = new URL(input);
  } catch {
    throw new SafeInvocationError("invalid_base_url");
  }

  if (
    baseUrl.protocol !== "https:" ||
    !baseUrl.hostname ||
    baseUrl.username ||
    baseUrl.password ||
    (baseUrl.pathname !== "/" && baseUrl.pathname !== "") ||
    baseUrl.search ||
    baseUrl.hash
  ) {
    throw new SafeInvocationError("invalid_base_url");
  }

  return new URL(`${baseUrl.origin}/`);
}

export function selectOperations(eventName, event) {
  if (eventName === "schedule") {
    const operations = SCHEDULE_OPERATIONS[event.schedule];
    if (!operations) throw new SafeInvocationError("unsupported_schedule");
    return operations;
  }

  if (eventName === "workflow_dispatch") {
    const operation = event.inputs?.operation;
    if (!Object.hasOwn(OPERATION_ROUTES, operation)) {
      throw new SafeInvocationError("unsupported_operation");
    }
    return [operation];
  }

  throw new SafeInvocationError("unsupported_event");
}

export function buildRequestHeaders({
  cronSecret,
  vercelAutomationBypassSecret,
}) {
  return {
    accept: "application/json",
    authorization: `Bearer ${cronSecret}`,
    "user-agent": "GoneViral-Scheduled-Operations/1",
    "x-vercel-protection-bypass": vercelAutomationBypassSecret,
  };
}

export function requestRoute({
  url,
  cronSecret,
  vercelAutomationBypassSecret,
  connectTimeoutMs = CONNECT_TIMEOUT_MS,
  totalTimeoutMs = TOTAL_TIMEOUT_MS,
}) {
  return new Promise((resolve, reject) => {
    let completed = false;
    let connectTimer;

    const finish = (callback, value) => {
      if (completed) return;
      completed = true;
      clearTimeout(connectTimer);
      clearTimeout(totalTimer);
      callback(value);
    };

    const request = https.request(
      url,
      {
        method: "GET",
        agent: false,
        headers: buildRequestHeaders({
          cronSecret,
          vercelAutomationBypassSecret,
        }),
      },
      (response) => {
        response.resume();
        response.on("error", (error) => finish(reject, safeFailure(error)));
        response.on("end", () => {
          const status = response.statusCode ?? 0;
          if (status < 200 || status >= 300) {
            finish(
              reject,
              new SafeInvocationError("non_2xx", String(status || "unknown")),
            );
            return;
          }
          finish(resolve, status);
        });
      },
    );

    const totalTimer = setTimeout(() => {
      request.destroy(new SafeInvocationError("total_timeout", "timeout"));
    }, totalTimeoutMs);

    request.on("socket", (socket) => {
      if (!socket.connecting) return;
      connectTimer = setTimeout(() => {
        request.destroy(new SafeInvocationError("connect_timeout", "timeout"));
      }, connectTimeoutMs);
      socket.once("secureConnect", () => clearTimeout(connectTimer));
    });

    request.on("error", (error) => finish(reject, safeFailure(error)));
    request.end();
  });
}

export async function runScheduledOperations({
  environment,
  event,
  eventName,
  logger = console,
  request = requestRoute,
}) {
  if (environment.GONEVIRAL_SCHEDULED_OPERATIONS_ENABLED !== "true") {
    throw new SafeInvocationError("scheduler_disabled");
  }

  const cronSecret = environment.CRON_SECRET;
  if (!cronSecret) throw new SafeInvocationError("missing_cron_secret");

  const vercelAutomationBypassSecret =
    environment.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!vercelAutomationBypassSecret) {
    throw new SafeInvocationError("missing_vercel_automation_bypass_secret");
  }

  const baseUrl = parseBaseUrl(
    environment.GONEVIRAL_SCHEDULED_OPERATIONS_BASE_URL,
  );
  const operations = selectOperations(eventName, event);

  for (const operation of operations) {
    const route = OPERATION_ROUTES[operation];
    const url = new URL(route, baseUrl);
    const startedAt = performance.now();

    try {
      const status = await request({
        url,
        cronSecret,
        vercelAutomationBypassSecret,
        connectTimeoutMs: CONNECT_TIMEOUT_MS,
        totalTimeoutMs: TOTAL_TIMEOUT_MS,
      });
      if (!Number.isInteger(status) || status < 200 || status >= 300) {
        throw new SafeInvocationError("non_2xx", String(status || "unknown"));
      }
      logger.info(
        `route=${route} status=${status} duration_ms=${Math.round(performance.now() - startedAt)}`,
      );
    } catch (error) {
      const failure = safeFailure(error);
      logger.error(
        `route=${route} status=${failure.status} duration_ms=${Math.round(performance.now() - startedAt)}`,
      );
      throw failure;
    }
  }
}

async function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const eventName = process.env.GITHUB_EVENT_NAME;
  if (!eventPath || !eventName) {
    throw new SafeInvocationError("missing_github_event");
  }

  let event;
  try {
    event = JSON.parse(await readFile(eventPath, "utf8"));
  } catch {
    throw new SafeInvocationError("invalid_github_event");
  }

  await runScheduledOperations({
    environment: process.env,
    event,
    eventName,
  });
}

const isMain =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  main().catch((error) => {
    const failure = safeFailure(error);
    console.error(`scheduled_operations_failed code=${failure.code}`);
    process.exitCode = 1;
  });
}
