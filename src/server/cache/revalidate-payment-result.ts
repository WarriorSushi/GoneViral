import "server-only";

import { revalidateTag } from "next/cache";

import type { DodoWebhookResult } from "@/server/payments/process-dodo-webhook";

import { PUBLIC_CACHE_TAGS } from "./tags";

export function revalidatePaymentResult(result: DodoWebhookResult) {
  if (result.kind !== "processed" || !result.listingPublicId) return;
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
    revalidateTag(PUBLIC_CACHE_TAGS.today(result.businessDate), { expire: 0 });
  }
}
