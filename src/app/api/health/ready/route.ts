import { getSqlClient } from "@/server/db/client";
import {
  correlationHeaders,
  requestCorrelationId,
} from "@/server/telemetry/request-context";

export async function GET(request: Request) {
  const requestId = requestCorrelationId(request);
  try {
    const [probe] = await getSqlClient()<{ ready: number }[]>`
      SELECT 1::integer AS ready
    `;
    if (probe?.ready !== 1) throw new Error("readiness_probe_invalid");
    return Response.json(
      { status: "ready" },
      { headers: correlationHeaders(requestId) },
    );
  } catch {
    return Response.json(
      { status: "unavailable" },
      { headers: correlationHeaders(requestId), status: 503 },
    );
  }
}
