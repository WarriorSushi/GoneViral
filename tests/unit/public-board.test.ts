import { describe, expect, it } from "vitest";

import { moneyPaise } from "@/domain/money";
import {
  buildPublicBoardCta,
  PUBLIC_BOARD_PAGE_SIZE,
} from "@/domain/public-board";

describe("Phase 3 public takeover CTA states", () => {
  it("keeps public leaderboard pages intentionally compact", () => {
    expect(PUBLIC_BOARD_PAGE_SIZE).toBe(10);
  });

  it("uses the truthful ₹499 minimum for an empty board", () => {
    expect(buildPublicBoardCta({ state: "empty-board" })).toEqual({
      actionLabel: "See how to take the first spot",
      checkoutEnabled: false,
      disclaimer:
        "Current estimate only. It does not reserve or guarantee a rank. Checkout is not enabled yet.",
      requiredPaymentPaise: 49_900n,
      state: "empty-board",
      targetRank: 1n,
    });
  });

  it("uses the same real minimum for an unoccupied low-population rank", () => {
    const cta = buildPublicBoardCta({ state: "open-position", targetRank: 6n });
    expect(cta.actionLabel).toBe("Position #6 could be yours");
    expect(cta.requiredPaymentPaise).toBe(49_900n);
    expect(cta.checkoutEnabled).toBe(false);
  });

  it("adds exactly ₹1 to the target total for a ranked takeover", () => {
    const cta = buildPublicBoardCta({
      state: "take-position",
      targetRank: 2n,
      targetTotalPaise: moneyPaise(1_000_000n),
    });
    expect(cta.actionLabel).toBe("Take #2");
    expect(cta.requiredPaymentPaise).toBe(1_000_100n);
    expect(cta.disclaimer).toContain("does not reserve or guarantee");
  });

  it("keeps a low target quote at the ₹499 initial floor", () => {
    const cta = buildPublicBoardCta({
      state: "take-position",
      targetRank: 12n,
      targetTotalPaise: moneyPaise(10_000n),
    });
    expect(cta.requiredPaymentPaise).toBe(49_900n);
  });

  it.each([
    { state: "open-position" as const, targetRank: 0n },
    {
      state: "take-position" as const,
      targetRank: 0n,
      targetTotalPaise: moneyPaise(49_900n),
    },
  ])("rejects an invalid target rank for $state", (input) => {
    expect(() => buildPublicBoardCta(input)).toThrow(RangeError);
  });
});
