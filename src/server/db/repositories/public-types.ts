import type { MoneyPaise } from "@/domain/money";

/** Explicitly browser-safe category shape. Database rows are never exported. */
export interface PublicCategory {
  readonly name: string;
  readonly slug: string;
  readonly sortOrder: number;
}

/**
 * Allowlisted listing identity for future public board queries. Financial and
 * owner/provider/audit row types cannot be assigned to this shape implicitly.
 */
export interface PublicListingIdentity {
  readonly category: PublicCategory;
  readonly confirmedTotalPaise: MoneyPaise;
  readonly destinationUrl: string;
  readonly logoUrl: string | null;
  readonly name: string;
  readonly publicId: string;
  readonly slug: string;
  readonly tagline: string;
}
