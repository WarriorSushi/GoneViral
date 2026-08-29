import "server-only";

import type { DodoWebhookResult } from "@/server/payments/process-dodo-webhook";

import { revalidatePublicCacheImpact } from "./invalidate-public";

export function revalidatePaymentResult(result: DodoWebhookResult) {
  if (
    result.kind !== "processed" ||
    !result.listingPublicId ||
    !result.listingSlug ||
    !result.categorySlug ||
    !result.businessDate
  )
    return;
  revalidatePublicCacheImpact({
    businessDate: result.businessDate,
    categorySlugs: [result.categorySlug],
    listingPublicId: result.listingPublicId,
    listingSlug: result.listingSlug,
  });
}
