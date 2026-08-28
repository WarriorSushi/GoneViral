import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { logger } = await import("@/server/telemetry/logger");
  logger.info("application_runtime_registered", { runtime: "nodejs" });
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  _request,
  context,
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { logger } = await import("@/server/telemetry/logger");
  const errorDetails =
    error instanceof Error
      ? {
          digest: "digest" in error ? String(error.digest) : undefined,
          errorName: error.name,
        }
      : { errorName: "UnknownError" };

  logger.error("request_error", {
    ...errorDetails,
    routePath: context.routePath,
    routeType: context.routeType,
  });
};
