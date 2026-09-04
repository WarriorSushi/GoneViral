import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { initializeSentryServer } from "@/server/telemetry/sentry";
import { logger } from "@/server/telemetry/logger";

export const maxDuration = 15;

const EXPECTED_TOKEN_SHA256 = [
  "07c2c2438b86e478",
  "f864b6471dfb7924",
  "4666d42f633bb0b3",
  "72769e735d8417cd",
].join("");

class SyntheticSchedulerCertificationError extends Error {
  override name = "SyntheticSchedulerCertificationError";
}

function hasValidToken(request: Request) {
  const token = request.headers.get("x-goneviral-synthetic-certification");
  if (!token || token.length > 200) return false;

  const actual = createHash("sha256").update(token, "utf8").digest();
  const expected = Buffer.from(
    process.env.SYNTHETIC_CERTIFICATION_TOKEN_SHA256 ?? EXPECTED_TOKEN_SHA256,
    "hex",
  );
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function POST(request: Request) {
  if (!hasValidToken(request)) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }

  const Sentry = initializeSentryServer();
  Sentry.withScope((scope) => {
    scope.setLevel("error");
    scope.setTag("certification.synthetic_scheduler_failure", "true");
    Sentry.captureException(
      new SyntheticSchedulerCertificationError(
        "GoneViral isolated scheduled failure certification",
      ),
    );
  });
  const sentryFlushed = await Sentry.flush(5_000);
  logger.error("synthetic_scheduler_failure_emitted", { sentryFlushed });

  return NextResponse.json(
    { status: "synthetic_certification_failure" },
    { status: 503 },
  );
}
