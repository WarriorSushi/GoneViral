import { revalidateTag } from "next/cache";

import { PUBLIC_CACHE_TAGS } from "@/server/cache/tags";
import {
  countEligibleOutboundClick,
  resolveEligibleOutboundSlug,
} from "@/server/clicks/outbound-redirect";
import { logger } from "@/server/telemetry/logger";
import { requestCorrelationId } from "@/server/telemetry/request-context";

const SAFE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
} as const;

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const requestId = requestCorrelationId(request);
  const { slug } = await context.params;
  const listing = await resolveEligibleOutboundSlug(slug);
  if (!listing) {
    return new Response("Not found", { status: 404, headers: SAFE_HEADERS });
  }

  try {
    const result = await countEligibleOutboundClick({ listing, request });
    if (result.counted) {
      revalidateTag(PUBLIC_CACHE_TAGS.main, { expire: 0 });
      revalidateTag(PUBLIC_CACHE_TAGS.today(result.businessDate), {
        expire: 0,
      });
      revalidateTag(PUBLIC_CACHE_TAGS.category(listing.categorySlug), {
        expire: 0,
      });
      revalidateTag(PUBLIC_CACHE_TAGS.listing(listing.listingPublicId), {
        expire: 0,
      });
      revalidateTag(PUBLIC_CACHE_TAGS.listingSlug(listing.slug), { expire: 0 });
    }
  } catch (error) {
    logger.error("outbound_click_aggregate_failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      listingPublicId: listing.listingPublicId,
      requestId,
    });
  }

  return new Response(null, {
    headers: {
      ...SAFE_HEADERS,
      Location: listing.destinationUrl,
      "X-Request-ID": requestId,
    },
    status: 307,
  });
}
