const ENABLED_VALUE = "true";
const REQUEST_TIMEOUT_MS = 45_000;

export const SCHEDULED_OPERATIONS = Object.freeze({
  "* * * * *": Object.freeze([
    Object.freeze({
      name: "drain-email-outbox",
      route: "/api/cron/drain-email-outbox",
    }),
  ]),
  "17 * * * *": Object.freeze([
    Object.freeze({
      name: "reconcile-payments",
      route: "/api/cron/reconcile-payments",
    }),
  ]),
  "43 2 * * *": Object.freeze([
    Object.freeze({
      name: "cleanup-logo-assets",
      route: "/api/cron/cleanup-logo-assets",
    }),
    Object.freeze({
      name: "cleanup-retention",
      route: "/api/cron/cleanup-retention",
    }),
  ]),
  "*/5 * * * *": Object.freeze([
    Object.freeze({
      name: "check-operational-health",
      route: "/api/cron/check-operational-health",
    }),
  ]),
});

function readRequiredBinding(environment, name) {
  const value = environment[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("scheduled_operations_configuration_invalid");
  }
  return value;
}

export function scheduledOperationsOrigin(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("scheduled_operations_configuration_invalid");
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("scheduled_operations_configuration_invalid");
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== "" ||
    (value !== parsed.origin && value !== `${parsed.origin}/`)
  ) {
    throw new Error("scheduled_operations_configuration_invalid");
  }

  return parsed.origin;
}

function elapsedMilliseconds(startedAt) {
  return Math.max(0, Math.round(performance.now() - startedAt));
}

async function invokeOperation({
  authorization,
  bypassSecret,
  fetchImplementation,
  operation,
  origin,
}) {
  const startedAt = performance.now();
  try {
    const response = await fetchImplementation(`${origin}${operation.route}`, {
      cache: "no-store",
      headers: {
        authorization: `Bearer ${authorization}`,
        "x-vercel-protection-bypass": bypassSecret,
      },
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    await response.body?.cancel();

    const durationMs = elapsedMilliseconds(startedAt);
    if (response.status < 200 || response.status >= 300) {
      console.error(
        `scheduled_operation operation=${operation.name} status=${response.status} duration_ms=${durationMs} result=http_failure`,
      );
      return false;
    }

    console.info(
      `scheduled_operation operation=${operation.name} status=${response.status} duration_ms=${durationMs} result=ok`,
    );
    return true;
  } catch (error) {
    const errorCode =
      error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError")
        ? "timeout"
        : "network_failure";
    console.error(
      `scheduled_operation operation=${operation.name} status=none duration_ms=${elapsedMilliseconds(startedAt)} result=${errorCode}`,
    );
    return false;
  }
}

export async function runScheduledOperations(
  cron,
  environment,
  fetchImplementation = fetch,
) {
  const operations = SCHEDULED_OPERATIONS[cron];
  if (!operations) throw new Error("scheduled_operations_schedule_unknown");

  if (environment.GONEVIRAL_SCHEDULED_OPERATIONS_ENABLED !== ENABLED_VALUE) {
    console.info("scheduled_operations result=disabled");
    return;
  }

  let authorization;
  let bypassSecret;
  let origin;
  try {
    origin = scheduledOperationsOrigin(
      readRequiredBinding(
        environment,
        "GONEVIRAL_SCHEDULED_OPERATIONS_BASE_URL",
      ),
    );
    authorization = readRequiredBinding(environment, "CRON_SECRET");
    bypassSecret = readRequiredBinding(
      environment,
      "VERCEL_AUTOMATION_BYPASS_SECRET",
    );
  } catch {
    console.error("scheduled_operations result=configuration_invalid");
    throw new Error("scheduled_operations_configuration_invalid");
  }

  const results = await Promise.all(
    operations.map((operation) =>
      invokeOperation({
        authorization,
        bypassSecret,
        fetchImplementation,
        operation,
        origin,
      }),
    ),
  );
  if (results.some((result) => !result)) {
    throw new Error("scheduled_operations_request_failed");
  }
}

const scheduledOperationsWorker = {
  async scheduled(controller, environment) {
    await runScheduledOperations(controller.cron, environment);
  },
};

export default scheduledOperationsWorker;
