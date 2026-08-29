import {
  correlationHeaders,
  requestCorrelationId,
} from "@/server/telemetry/request-context";

export function GET(request: Request) {
  const requestId = requestCorrelationId(request);
  return Response.json(
    { status: "ok" },
    { headers: correlationHeaders(requestId) },
  );
}
