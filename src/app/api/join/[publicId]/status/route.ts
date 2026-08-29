import { NextResponse } from "next/server";

import { getPublicAttemptStatus } from "@/server/db/repositories/private/guest-checkout";
import { enqueueVerificationDelayIfDue } from "@/server/email/enqueue-verification-delay";
import { consumeStatusRateLimit } from "@/server/security/status-rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await params;
  const remoteIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local";
  if (!(await consumeStatusRateLimit(remoteIp, publicId))) {
    return NextResponse.json(
      { status: "rate_limited" },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
          "Retry-After": "60",
        },
        status: 429,
      },
    );
  }
  const status = await getPublicAttemptStatus(publicId);
  if (status?.state === "pending") {
    await enqueueVerificationDelayIfDue(publicId).catch(() => false);
  }
  return NextResponse.json(
    status
      ? {
          resultPath:
            status.state === "confirmed"
              ? `/join/${encodeURIComponent(publicId)}/confirmed`
              : undefined,
          status: status.state,
        }
      : { status: "not_found" },
    {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
      status: status ? 200 : 404,
    },
  );
}
