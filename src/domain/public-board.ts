import { moneyPaise, type MoneyPaise } from "./money";
import { INITIAL_SPONSORSHIP_MIN_PAISE } from "./policy";
import { calculateTakeoverQuote } from "./ranking";

export const PUBLIC_BOARD_PAGE_SIZE = 10;

export type PublicBoardCtaState =
  "empty-board" | "open-position" | "take-position";

export interface PublicBoardCta {
  readonly actionLabel: string;
  readonly checkoutEnabled: false;
  readonly disclaimer: string;
  readonly requiredPaymentPaise: MoneyPaise;
  readonly state: PublicBoardCtaState;
  readonly targetRank: bigint;
}

const informationalDisclaimer =
  "Current estimate only. It does not reserve or guarantee a rank. Checkout is not enabled yet.";

export function buildPublicBoardCta(
  input:
    | Readonly<{ state: "empty-board" }>
    | Readonly<{ state: "open-position"; targetRank: bigint }>
    | Readonly<{
        state: "take-position";
        targetRank: bigint;
        targetTotalPaise: MoneyPaise;
      }>,
): PublicBoardCta {
  if (input.state === "empty-board") {
    return {
      actionLabel: "See how to take the first spot",
      checkoutEnabled: false,
      disclaimer: informationalDisclaimer,
      requiredPaymentPaise: moneyPaise(INITIAL_SPONSORSHIP_MIN_PAISE),
      state: input.state,
      targetRank: 1n,
    };
  }

  if (input.state === "open-position") {
    if (input.targetRank < 1n) {
      throw new RangeError("An open position rank must be positive.");
    }

    return {
      actionLabel: `Position #${input.targetRank.toString()} could be yours`,
      checkoutEnabled: false,
      disclaimer: informationalDisclaimer,
      requiredPaymentPaise: moneyPaise(INITIAL_SPONSORSHIP_MIN_PAISE),
      state: input.state,
      targetRank: input.targetRank,
    };
  }

  if (input.targetRank < 1n) {
    throw new RangeError("A takeover target rank must be positive.");
  }

  const quote = calculateTakeoverQuote({
    listingCurrentTotalPaise: moneyPaise(0n),
    minimumRequiredPaise: moneyPaise(INITIAL_SPONSORSHIP_MIN_PAISE),
    targetTotalPaise: input.targetTotalPaise,
  });

  return {
    actionLabel: `Take #${input.targetRank.toString()}`,
    checkoutEnabled: false,
    disclaimer: informationalDisclaimer,
    requiredPaymentPaise: quote.requiredPaymentPaise,
    state: input.state,
    targetRank: input.targetRank,
  };
}
