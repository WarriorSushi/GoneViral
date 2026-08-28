import type { MoneyPaise } from "./money";
import { domainFailure, domainSuccess, type DomainResult } from "./result";

export const LIFECYCLE_STATUSES = [
  "draft",
  "payment_pending",
  "active",
  "inactive_reversed",
  "removed",
] as const;

export const MODERATION_STATUSES = [
  "unreviewed",
  "pending_review",
  "clear",
  "suspended",
] as const;

export type LifecycleStatus = (typeof LIFECYCLE_STATUSES)[number];
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

export type ListingTransitionErrorCode =
  | "LISTING_LIFECYCLE_TRANSITION_NOT_ALLOWED"
  | "LISTING_MODERATION_TRANSITION_NOT_ALLOWED";

export type PublicEligibilityErrorCode =
  | "LISTING_LIFECYCLE_NOT_ACTIVE"
  | "LISTING_MODERATION_NOT_CLEAR"
  | "LISTING_TOTAL_NOT_POSITIVE"
  | "LISTING_DESTINATION_NOT_APPROVED";

export type ListingEligibilityInput = Readonly<{
  lifecycleStatus: LifecycleStatus;
  moderationStatus: ModerationStatus;
  confirmedTotalPaise: MoneyPaise;
  hasSafeApprovedDestination: boolean;
}>;

const lifecycleTransitions: Readonly<
  Record<LifecycleStatus, readonly LifecycleStatus[]>
> = {
  draft: ["payment_pending"],
  payment_pending: ["draft", "active"],
  active: ["inactive_reversed", "removed"],
  inactive_reversed: ["active", "removed"],
  removed: [],
};

const moderationTransitions: Readonly<
  Record<ModerationStatus, readonly ModerationStatus[]>
> = {
  unreviewed: ["clear", "pending_review"],
  pending_review: ["clear", "suspended"],
  clear: ["suspended"],
  suspended: ["clear"],
};

export function canTransitionLifecycle(
  from: LifecycleStatus,
  to: LifecycleStatus,
): boolean {
  return lifecycleTransitions[from].includes(to);
}

export function validateLifecycleTransition(
  from: LifecycleStatus,
  to: LifecycleStatus,
): DomainResult<LifecycleStatus, ListingTransitionErrorCode> {
  return canTransitionLifecycle(from, to)
    ? domainSuccess(to)
    : domainFailure("LISTING_LIFECYCLE_TRANSITION_NOT_ALLOWED");
}

export function canTransitionModeration(
  from: ModerationStatus,
  to: ModerationStatus,
): boolean {
  return moderationTransitions[from].includes(to);
}

export function validateModerationTransition(
  from: ModerationStatus,
  to: ModerationStatus,
): DomainResult<ModerationStatus, ListingTransitionErrorCode> {
  return canTransitionModeration(from, to)
    ? domainSuccess(to)
    : domainFailure("LISTING_MODERATION_TRANSITION_NOT_ALLOWED");
}

export function publicEligibilityErrors(
  listing: ListingEligibilityInput,
): readonly PublicEligibilityErrorCode[] {
  const errors: PublicEligibilityErrorCode[] = [];

  if (listing.lifecycleStatus !== "active") {
    errors.push("LISTING_LIFECYCLE_NOT_ACTIVE");
  }

  if (listing.moderationStatus !== "clear") {
    errors.push("LISTING_MODERATION_NOT_CLEAR");
  }

  if (listing.confirmedTotalPaise <= 0n) {
    errors.push("LISTING_TOTAL_NOT_POSITIVE");
  }

  if (!listing.hasSafeApprovedDestination) {
    errors.push("LISTING_DESTINATION_NOT_APPROVED");
  }

  return errors;
}

export function isPublicEligible(listing: ListingEligibilityInput): boolean {
  return publicEligibilityErrors(listing).length === 0;
}
