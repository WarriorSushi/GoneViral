"use server";

import {
  validateListingEdit,
  type ListingEditField,
} from "@/domain/listing-edit";
import { toIstBusinessDate } from "@/domain/today";
import { getVerifiedAuthUser } from "@/server/auth/session";
import { revalidatePublicCacheImpact } from "@/server/cache/invalidate-public";
import { editOwnedListing } from "@/server/listings/edit-listing";
import { verifyLogoUploadIntent } from "@/server/storage/logo-intent";
import {
  createLogoUploadIntent,
  finalizeLogoUpload,
} from "@/server/storage/logo-service";
import { SupabaseLogoStorage } from "@/server/storage/logo-storage";

export type ListingEditActionState = Readonly<{
  errors?: Partial<Record<ListingEditField, string>>;
  message?: string;
  ok?: boolean;
}>;

function invalidateListing(input: {
  categorySlug: string;
  listingPublicId: string;
  listingSlug: string;
}) {
  revalidatePublicCacheImpact({
    businessDate: toIstBusinessDate(new Date()),
    categorySlugs: [input.categorySlug],
    listingPublicId: input.listingPublicId,
    listingSlug: input.listingSlug,
  });
}

export async function saveListingEdit(
  slug: string,
  _state: ListingEditActionState,
  formData: FormData,
): Promise<ListingEditActionState> {
  const user = await getVerifiedAuthUser();
  if (!user) return { message: "Your secure session expired." };
  const validated = validateListingEdit(formData);
  if (!validated.ok) return { errors: validated.errors };
  const result = await editOwnedListing({
    edit: validated.value,
    listingSlug: slug,
    userId: user.id,
  });
  if (result.kind === "rejected") return { message: result.message };
  if (result.immediateCount > 0) invalidateListing(result);
  const messages = [];
  if (result.immediateCount > 0)
    messages.push(
      `${result.immediateCount} safe change${result.immediateCount === 1 ? "" : "s"} published.`,
    );
  if (result.reviewCount > 0)
    messages.push(
      `${result.reviewCount} sensitive change${result.reviewCount === 1 ? "" : "s"} sent for review; current public values stay live.`,
    );
  if (messages.length === 0) messages.push("No changes were needed.");
  return { message: messages.join(" "), ok: true };
}

export async function requestLogoIntent(
  slug: string,
  contentType: string,
  declaredBytes: number,
) {
  const user = await getVerifiedAuthUser();
  if (!user)
    return {
      kind: "rejected",
      message: "Your secure session expired.",
    } as const;
  try {
    return await createLogoUploadIntent({
      contentType,
      declaredBytes,
      listingSlug: slug,
      storage: new SupabaseLogoStorage(),
      userId: user.id,
    });
  } catch {
    return {
      kind: "rejected",
      message: "Logo storage is not configured.",
    } as const;
  }
}

export async function finishLogoUpload(slug: string, token: string) {
  const user = await getVerifiedAuthUser();
  const intent = verifyLogoUploadIntent(token);
  if (!user || !intent || intent.userId !== user.id)
    return {
      kind: "rejected",
      message: "This upload intent expired.",
    } as const;
  const result = await finalizeLogoUpload({
    assetId: intent.assetId,
    storage: new SupabaseLogoStorage(),
    userId: user.id,
  });
  if (result.kind === "applied") {
    invalidateListing({
      categorySlug: result.categorySlug,
      listingPublicId: result.listingPublicId,
      listingSlug: result.listingSlug,
    });
  }
  return result;
}
