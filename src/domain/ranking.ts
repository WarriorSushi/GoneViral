import {
  addMoney,
  ceilDiv,
  isWholeRupee,
  maxMoney,
  moneyPaise,
  subtractMoney,
  type MoneyPaise,
} from "./money";
import {
  INITIAL_SPONSORSHIP_MIN_PAISE,
  PAYMENT_GRANULARITY_PAISE,
  POLICY_VERSION,
  RAISE_ABSOLUTE_FLOOR_PAISE,
  RAISE_PERCENT_DENOMINATOR,
  RAISE_PERCENT_NUMERATOR,
  TAKEOVER_INCREMENT_PAISE,
  type PolicyVersion,
} from "./policy";
import { domainFailure, domainSuccess, type DomainResult } from "./result";

export type SponsorshipValidationErrorCode =
  | "SPONSORSHIP_AMOUNT_NOT_POSITIVE"
  | "SPONSORSHIP_AMOUNT_NOT_WHOLE_RUPEE"
  | "SPONSORSHIP_BELOW_INITIAL_MINIMUM";

export type PolicyCalculation = Readonly<{
  policyVersion: PolicyVersion;
}>;

export type MinimumRaiseCalculation = PolicyCalculation &
  Readonly<{
    originalSponsorshipPaise: MoneyPaise;
    percentageComponentPaise: MoneyPaise;
    minimumRequiredPaise: MoneyPaise;
  }>;

export type TakeoverQuote = PolicyCalculation &
  Readonly<{
    listingCurrentTotalPaise: MoneyPaise;
    targetTotalPaise: MoneyPaise;
    minimumRequiredPaise: MoneyPaise;
    neededToExceedPaise: MoneyPaise;
    requiredPaymentPaise: MoneyPaise;
  }>;

export type RankableListing = Readonly<{
  id: string;
  confirmedTotalPaise: MoneyPaise;
  currentTotalReachedAt: Date;
}>;

export type EstimatedRankCalculation = PolicyCalculation &
  Readonly<{
    estimatedRank: bigint;
    hypotheticalTotalPaise: MoneyPaise;
  }>;

function policyMoney(value: bigint): MoneyPaise {
  return moneyPaise(value);
}

export function validateInitialSponsorship(
  amountPaise: MoneyPaise,
): DomainResult<MoneyPaise, SponsorshipValidationErrorCode> {
  if (amountPaise <= 0n) {
    return domainFailure("SPONSORSHIP_AMOUNT_NOT_POSITIVE");
  }

  if (!isWholeRupee(amountPaise)) {
    return domainFailure("SPONSORSHIP_AMOUNT_NOT_WHOLE_RUPEE");
  }

  if (amountPaise < INITIAL_SPONSORSHIP_MIN_PAISE) {
    return domainFailure("SPONSORSHIP_BELOW_INITIAL_MINIMUM");
  }

  return domainSuccess(amountPaise);
}

export function calculateMinimumRaise(
  originalSponsorshipPaise: MoneyPaise,
): MinimumRaiseCalculation {
  const originalValidation = validateInitialSponsorship(
    originalSponsorshipPaise,
  );

  if (!originalValidation.ok) {
    throw new RangeError(
      "Original sponsorship must be a valid successful initial sponsorship.",
    );
  }

  const percentageRupees = ceilDiv(
    originalSponsorshipPaise * RAISE_PERCENT_NUMERATOR,
    RAISE_PERCENT_DENOMINATOR * PAYMENT_GRANULARITY_PAISE,
  );
  const percentageComponentPaise = moneyPaise(
    percentageRupees * PAYMENT_GRANULARITY_PAISE,
  );
  const minimumRequiredPaise = maxMoney(
    percentageComponentPaise,
    policyMoney(RAISE_ABSOLUTE_FLOOR_PAISE),
  );

  return {
    policyVersion: POLICY_VERSION,
    originalSponsorshipPaise,
    percentageComponentPaise,
    minimumRequiredPaise,
  };
}

export function calculateTakeoverQuote(input: {
  listingCurrentTotalPaise: MoneyPaise;
  targetTotalPaise: MoneyPaise;
  minimumRequiredPaise: MoneyPaise;
}): TakeoverQuote {
  const targetWithIncrement = addMoney(
    input.targetTotalPaise,
    policyMoney(TAKEOVER_INCREMENT_PAISE),
  );
  const neededToExceedPaise = subtractMoney(
    targetWithIncrement,
    input.listingCurrentTotalPaise,
  );
  const requiredPaymentPaise = maxMoney(
    input.minimumRequiredPaise,
    neededToExceedPaise,
  );

  return {
    policyVersion: POLICY_VERSION,
    listingCurrentTotalPaise: input.listingCurrentTotalPaise,
    targetTotalPaise: input.targetTotalPaise,
    minimumRequiredPaise: input.minimumRequiredPaise,
    neededToExceedPaise,
    requiredPaymentPaise,
  };
}

function compareDates(left: Date, right: Date): -1 | 0 | 1 {
  const leftTime = left.getTime();
  const rightTime = right.getTime();

  if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) {
    throw new RangeError("Ranking timestamps must be valid dates.");
  }

  if (leftTime < rightTime) {
    return -1;
  }

  if (leftTime > rightTime) {
    return 1;
  }

  return 0;
}

export function compareMainRank(
  left: RankableListing,
  right: RankableListing,
): -1 | 0 | 1 {
  if (left.confirmedTotalPaise > right.confirmedTotalPaise) {
    return -1;
  }

  if (left.confirmedTotalPaise < right.confirmedTotalPaise) {
    return 1;
  }

  const reachedTimeOrder = compareDates(
    left.currentTotalReachedAt,
    right.currentTotalReachedAt,
  );

  if (reachedTimeOrder !== 0) {
    return reachedTimeOrder;
  }

  if (left.id < right.id) {
    return -1;
  }

  if (left.id > right.id) {
    return 1;
  }

  return 0;
}

export function rankSnapshot(
  listings: readonly RankableListing[],
): readonly RankableListing[] {
  return [...listings].sort(compareMainRank);
}

export function estimateRank(input: {
  snapshot: readonly RankableListing[];
  listingId: string;
  currentTotalPaise: MoneyPaise;
  paymentAmountPaise: MoneyPaise;
  hypotheticalReachedAt: Date;
}): EstimatedRankCalculation {
  const hypotheticalTotalPaise = addMoney(
    input.currentTotalPaise,
    input.paymentAmountPaise,
  );
  const hypothetical: RankableListing = {
    id: input.listingId,
    confirmedTotalPaise: hypotheticalTotalPaise,
    currentTotalReachedAt: input.hypotheticalReachedAt,
  };
  const withoutCurrentListing = input.snapshot.filter(
    (listing) => listing.id !== input.listingId,
  );
  const ordered = rankSnapshot([...withoutCurrentListing, hypothetical]);
  let rank = 1n;

  for (const listing of ordered) {
    if (listing.id === input.listingId) {
      return {
        policyVersion: POLICY_VERSION,
        estimatedRank: rank,
        hypotheticalTotalPaise,
      };
    }

    rank += 1n;
  }

  throw new Error("Hypothetical listing was not present in its rank snapshot.");
}
