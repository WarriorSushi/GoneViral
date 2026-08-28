import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { PUBLIC_CACHE_TAGS } from "@/server/cache/tags";
import {
  getDodoWebhookConfiguration,
  verifyAndNormalizeDodoWebhook,
} from "@/server/payments/dodo-webhook";
import { processDodoWebhook } from "@/server/payments/process-dodo-webhook";

export const maxDuration = 15;

const MAX_WEBHOOK_BYTES = 1_000_000;

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "private, no-store, max-age=0" },
    status,
  });
}

export async function handleDodoWebhook(request: Request): Promise<Response> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_WEBHOOK_BYTES) {
    return response({ status: "invalid_request" }, 413);
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return response({ status: "invalid_request" }, 400);
  }
  if (Buffer.byteLength(rawBody, "utf8") > MAX_WEBHOOK_BYTES) {
    return response({ status: "invalid_request" }, 413);
  }

  const eventId = request.headers.get("webhook-id");
  if (!eventId || eventId.length > 200) {
    return response({ status: "invalid_signature" }, 400);
  }

  let event;
  try {
    event = verifyAndNormalizeDodoWebhook(rawBody, request.headers);
  } catch {
    return response({ status: "invalid_signature_or_payload" }, 400);
  }

  try {
    const configuration = getDodoWebhookConfiguration();
    const result = await processDodoWebhook({
      event,
      eventId,
      expectedBusinessId: configuration.businessId,
      providerEnvironment: configuration.environment,
    });

    if (result.kind === "processed" && result.listingPublicId) {
      try {
        revalidateTag(PUBLIC_CACHE_TAGS.main, { expire: 0 });
        revalidateTag(PUBLIC_CACHE_TAGS.activity, { expire: 0 });
        revalidateTag(PUBLIC_CACHE_TAGS.listing(result.listingPublicId), {
          expire: 0,
        });
        if (result.listingSlug) {
          revalidateTag(PUBLIC_CACHE_TAGS.listingSlug(result.listingSlug), {
            expire: 0,
          });
        }
        if (result.categorySlug) {
          revalidateTag(PUBLIC_CACHE_TAGS.category(result.categorySlug), {
            expire: 0,
          });
        }
        if (result.businessDate) {
          revalidateTag(PUBLIC_CACHE_TAGS.today(result.businessDate), {
            expire: 0,
          });
        }
      } catch (cacheError) {
        console.error("payment_cache_invalidation_failed", {
          eventId,
          message:
            cacheError instanceof Error ? cacheError.message : "unknown_error",
        });
      }
    }

    return response({ status: result.kind });
  } catch (processingError) {
    console.error("dodo_webhook_retryable_failure", {
      eventId,
      message:
        processingError instanceof Error
          ? processingError.message
          : "unknown_error",
    });
    return response({ status: "retry" }, 503);
  }
}

export async function POST(request: Request) {
  return handleDodoWebhook(request);
}
