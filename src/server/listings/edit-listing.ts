import "server-only";

import type { ListingEditInput } from "@/domain/listing-edit";
import { normalizeListingName } from "@/domain/listing-edit";
import { getSqlClient } from "@/server/db/client";

type ListingRow = {
  category_id: string;
  category_name: string;
  category_slug: string;
  destination_canonical_key: string;
  destination_host: string;
  destination_url: string;
  id: string;
  moderation_status: string;
  name: string;
  name_normalized: string;
  public_id: string;
  slug: string;
  tagline: string;
};

type Change = Readonly<{
  changeType: string;
  oldValue: Record<string, unknown>;
  proposedValue: Record<string, unknown>;
}>;

export type EditListingResult =
  | Readonly<{
      categorySlug: string;
      immediateCount: number;
      kind: "saved";
      listingPublicId: string;
      listingSlug: string;
      reviewCount: number;
    }>
  | Readonly<{ kind: "rejected"; message: string }>;

export async function editOwnedListing(input: {
  edit: ListingEditInput;
  listingSlug: string;
  userId: string;
}): Promise<EditListingResult> {
  try {
    return await getSqlClient().begin(async (transaction) => {
      const [listing] = await transaction<ListingRow[]>`
        SELECT listing.id, listing.public_id, listing.slug, listing.name,
               listing.name_normalized, listing.tagline, listing.destination_url,
               listing.destination_canonical_key, listing.destination_host,
               listing.moderation_status, listing.category_id,
               category.slug AS category_slug, category.name AS category_name
        FROM app.listings AS listing
        JOIN app.categories AS category ON category.id = listing.category_id
        JOIN private.listing_owners AS ownership
          ON ownership.listing_id = listing.id
         AND ownership.user_id = ${input.userId}
         AND ownership.revoked_at IS NULL
        WHERE listing.slug = ${input.listingSlug}
          AND listing.lifecycle_status <> 'removed'
        FOR UPDATE OF listing
      `;
      if (!listing)
        return {
          kind: "rejected",
          message: "This listing cannot be edited.",
        } as const;
      const [category] = await transaction<{ id: string; name: string }[]>`
        SELECT id, name FROM app.categories
        WHERE slug = ${input.edit.categorySlug} AND is_active = true
        LIMIT 1
      `;
      if (!category)
        return {
          kind: "rejected",
          message: "Choose a current category.",
        } as const;

      if (input.edit.destination.url !== listing.destination_url) {
        const [duplicateDestination] = await transaction<
          { present: boolean }[]
        >`
          SELECT EXISTS (
            SELECT 1 FROM app.listings
            WHERE destination_canonical_key = ${input.edit.destination.canonicalKey}
              AND id <> ${listing.id}
          ) AS present
        `;
        if (duplicateDestination?.present)
          return {
            kind: "rejected",
            message: "That destination already has a GoneViral listing.",
          } as const;
      }

      const immediate: Change[] = [];
      const reviewed: Change[] = [];
      const safeForImmediate = listing.moderation_status === "clear";
      if (input.edit.tagline !== listing.tagline) {
        (safeForImmediate ? immediate : reviewed).push({
          changeType: "tagline",
          oldValue: { tagline: listing.tagline },
          proposedValue: { tagline: input.edit.tagline },
        });
      }
      if (input.edit.name !== listing.name) {
        const minor =
          normalizeListingName(input.edit.name) === listing.name_normalized;
        (safeForImmediate && minor ? immediate : reviewed).push({
          changeType: "name",
          oldValue: { name: listing.name },
          proposedValue: { name: input.edit.name },
        });
      }
      if (input.edit.destination.url !== listing.destination_url) {
        const sameHost =
          input.edit.destination.host === listing.destination_host;
        (safeForImmediate && sameHost ? immediate : reviewed).push({
          changeType: "destination",
          oldValue: {
            canonicalKey: listing.destination_canonical_key,
            host: listing.destination_host,
            url: listing.destination_url,
          },
          proposedValue: input.edit.destination,
        });
      }
      if (category.id !== listing.category_id) {
        reviewed.push({
          changeType: "category",
          oldValue: {
            id: listing.category_id,
            name: listing.category_name,
            slug: listing.category_slug,
          },
          proposedValue: {
            id: category.id,
            name: category.name,
            slug: input.edit.categorySlug,
          },
        });
      }

      for (const change of immediate) {
        await transaction`
          INSERT INTO private.listing_change_requests (
            listing_id, requested_by_user_id, change_type, old_value,
            proposed_value, state, review_reason, reviewed_at
          ) VALUES (
            ${listing.id}, ${input.userId}, ${change.changeType},
            ${JSON.stringify(change.oldValue)}::jsonb,
            ${JSON.stringify(change.proposedValue)}::jsonb,
            'approved', 'automatic_low_risk', transaction_timestamp()
          )
        `;
      }
      let reviewCount = 0;
      for (const change of reviewed) {
        const inserted = await transaction<{ id: string }[]>`
          INSERT INTO private.listing_change_requests (
            listing_id, requested_by_user_id, change_type,
            old_value, proposed_value, state
          ) VALUES (
            ${listing.id}, ${input.userId}, ${change.changeType},
            ${JSON.stringify(change.oldValue)}::jsonb,
            ${JSON.stringify(change.proposedValue)}::jsonb, 'pending'
          ) ON CONFLICT DO NOTHING
          RETURNING id
        `;
        reviewCount += inserted.length;
      }

      const immediateTypes = new Set(
        immediate.map((change) => change.changeType),
      );
      if (immediate.length > 0) {
        await transaction`
          UPDATE app.listings SET
            tagline = CASE WHEN ${immediateTypes.has("tagline")} THEN ${input.edit.tagline} ELSE tagline END,
            name = CASE WHEN ${immediateTypes.has("name")} THEN ${input.edit.name} ELSE name END,
            name_normalized = CASE WHEN ${immediateTypes.has("name")}
              THEN ${normalizeListingName(input.edit.name)} ELSE name_normalized END,
            destination_url = CASE WHEN ${immediateTypes.has("destination")}
              THEN ${input.edit.destination.url} ELSE destination_url END,
            destination_canonical_key = CASE WHEN ${immediateTypes.has("destination")}
              THEN ${input.edit.destination.canonicalKey} ELSE destination_canonical_key END,
            destination_host = CASE WHEN ${immediateTypes.has("destination")}
              THEN ${input.edit.destination.host} ELSE destination_host END,
            version = version + 1, updated_at = transaction_timestamp()
          WHERE id = ${listing.id}
        `;
      }
      return {
        categorySlug: listing.category_slug,
        immediateCount: immediate.length,
        kind: "saved",
        listingPublicId: listing.public_id,
        listingSlug: listing.slug,
        reviewCount,
      } as const;
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      return {
        kind: "rejected",
        message: "That destination already has a GoneViral listing.",
      };
    }
    throw error;
  }
}
