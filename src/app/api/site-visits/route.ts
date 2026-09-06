import { readPublicEnv } from "@/config/env/public";
import { countSiteVisit } from "@/server/analytics/site-visits";
import { logger } from "@/server/telemetry/logger";
import {
  correlationHeaders,
  requestCorrelationId,
} from "@/server/telemetry/request-context";

function isConfiguredOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return (
      new URL(origin).origin ===
      new URL(readPublicEnv().NEXT_PUBLIC_SITE_URL).origin
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const requestId = requestCorrelationId(request);
  const headers = correlationHeaders(requestId);
  if (!isConfiguredOrigin(request)) {
    return Response.json({ error: "not_found" }, { headers, status: 404 });
  }

  try {
    const result = await countSiteVisit({ request });
    return Response.json({ totalVisits: result.totalVisits }, { headers });
  } catch (error) {
    logger.error("site_visit_count_failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      requestId,
    });
    return Response.json({ error: "unavailable" }, { headers, status: 503 });
  }
}
