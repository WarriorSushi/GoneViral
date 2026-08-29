import "server-only";

import { randomUUID } from "node:crypto";

const safeRequestId = /^[A-Za-z0-9._:-]{8,120}$/;

export function requestCorrelationId(request: Request): string {
  const supplied = request.headers.get("x-request-id");
  return supplied && safeRequestId.test(supplied) ? supplied : randomUUID();
}

export function correlationHeaders(requestId: string) {
  return {
    "Cache-Control": "private, no-store, max-age=0",
    "X-Request-ID": requestId,
  } as const;
}
