import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { getDatabase } from "../../client";
import { listingOwners } from "../../schema";

export async function findActiveListingOwner(
  listingId: string,
  userId: string,
) {
  const [owner] = await getDatabase()
    .select()
    .from(listingOwners)
    .where(
      and(
        eq(listingOwners.listingId, listingId),
        eq(listingOwners.userId, userId),
        isNull(listingOwners.revokedAt),
      ),
    )
    .limit(1);

  return owner ?? null;
}
