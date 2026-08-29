/** Explicitly browser-safe category shape. Database rows are never exported. */
export interface PublicCategory {
  readonly name: string;
  readonly slug: string;
  readonly sortOrder: number;
}

/** Every public money and rank value is a base-10 string. */
export interface PublicListingIdentity {
  readonly category: PublicCategory;
  readonly confirmedTotalPaise: string;
  readonly destinationUrl: string;
  readonly logoUrl: string | null;
  readonly name: string;
  readonly publicId: string;
  readonly slug: string;
  readonly tagline: string;
  /** Privacy-preserving, unique-per-listing-per-IST-day aggregate. Never ranking input. */
  readonly uniqueClicks: string;
}

export interface PublicTakeoverQuote {
  readonly estimatedAt: string;
  readonly policyVersion: string;
  readonly requiredPaymentPaise: string;
  readonly targetRank: string;
  readonly targetTotalPaise: string;
}

export interface PublicMainBoardEntry extends PublicListingIdentity {
  readonly currentTotalReachedAt: string;
  readonly rank: string;
  readonly takeoverQuote: PublicTakeoverQuote;
}

export interface PublicTodayBoardEntry extends PublicListingIdentity {
  readonly rank: string;
  readonly takeoverQuote: PublicTakeoverQuote;
  readonly todayNetPaise: string;
  readonly todayTotalReachedAt: string;
}

export interface PublicBoardPage<TEntry> {
  readonly businessDate: string | null;
  readonly entries: readonly TEntry[];
  readonly generatedAt: string;
  readonly nextCursor: string | null;
}

export type PublicMovementKind = "joined" | "added" | "adjusted" | "restored";

export interface PublicMovement {
  readonly amountDeltaPaise: string;
  readonly appliedAt: string;
  readonly kind: PublicMovementKind;
}

export interface PublicActivityItem extends PublicMovement {
  readonly currentMainRank: string;
  readonly listingName: string;
  readonly listingPublicId: string;
  readonly listingSlug: string;
}

export interface PublicListingDetail extends PublicListingIdentity {
  readonly currentMainRank: string;
  readonly currentTotalReachedAt: string;
  readonly movements: readonly PublicMovement[];
  readonly takeoverQuote: PublicTakeoverQuote;
  readonly todayNetPaise: string | null;
  readonly todayRank: string | null;
}

export interface PublicEstimatedRank {
  readonly estimatedAt: string;
  readonly estimatedRank: string;
  readonly estimatedTotalPaise: string;
  readonly policyVersion: string;
}
