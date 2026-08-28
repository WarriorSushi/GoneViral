import { describe, expect, it } from "vitest";
import { addMoney, moneyPaise, parseWholeInr } from "@/domain/money";
import {
  INITIAL_SPONSORSHIP_MIN_PAISE,
  POLICY_VERSION,
  RAISE_ABSOLUTE_FLOOR_PAISE,
} from "@/domain/policy";
import {
  calculateMinimumRaise,
  calculateTakeoverQuote,
  compareMainRank,
  estimateRank,
  rankSnapshot,
  validateInitialSponsorship,
} from "@/domain/ranking";

function inr(rupees: string) {
  const parsed = parseWholeInr(rupees);

  if (!parsed.ok) {
    throw new Error(parsed.code);
  }

  return parsed.value;
}

describe("sponsorship and ranking policy", () => {
  it("locks the versioned initial sponsorship floor", () => {
    expect(POLICY_VERSION).toBe("2026-08-29-v2");
    expect(INITIAL_SPONSORSHIP_MIN_PAISE).toBe(49_900n);
    expect(validateInitialSponsorship(inr("498"))).toEqual({
      ok: false,
      code: "SPONSORSHIP_BELOW_INITIAL_MINIMUM",
    });
    expect(validateInitialSponsorship(inr("499"))).toEqual({
      ok: true,
      value: 49_900n,
    });
    expect(validateInitialSponsorship(moneyPaise(49_950n))).toEqual({
      ok: false,
      code: "SPONSORSHIP_AMOUNT_NOT_WHOLE_RUPEE",
    });
    expect(validateInitialSponsorship(moneyPaise(0n))).toEqual({
      ok: false,
      code: "SPONSORSHIP_AMOUNT_NOT_POSITIVE",
    });
    expect(() => calculateMinimumRaise(inr("498"))).toThrow(RangeError);
  });

  it.each([
    ["499", "50", "1000"],
    ["8000", "800", "1000"],
    ["9999", "1000", "1000"],
    ["10000", "1000", "1000"],
    ["10001", "1001", "1001"],
    ["15000", "1500", "1500"],
    ["25000", "2500", "2500"],
    ["25005", "2501", "2501"],
  ])("calculates the minimum raise for ₹%s", (original, component, minimum) => {
    expect(calculateMinimumRaise(inr(original))).toEqual({
      policyVersion: POLICY_VERSION,
      originalSponsorshipPaise: inr(original),
      percentageComponentPaise: inr(component),
      minimumRequiredPaise: inr(minimum),
    });
  });

  it("proves whole-rupee ceiling and monotonicity over a broad input range", () => {
    let previousMinimum = moneyPaise(RAISE_ABSOLUTE_FLOOR_PAISE);

    for (
      let originalRupees = 499n;
      originalRupees <= 2_000_000n;
      originalRupees += 997n
    ) {
      const originalPaise = moneyPaise(originalRupees * 100n);
      const calculation = calculateMinimumRaise(originalPaise);
      const component = calculation.percentageComponentPaise;

      expect(component % 100n).toBe(0n);
      expect(component * 100n).toBeGreaterThanOrEqual(originalPaise * 10n);
      expect((component - 100n) * 100n).toBeLessThan(originalPaise * 10n);
      expect(calculation.minimumRequiredPaise).toBeGreaterThanOrEqual(
        RAISE_ABSOLUTE_FLOOR_PAISE,
      );
      expect(calculation.minimumRequiredPaise).toBeGreaterThanOrEqual(
        previousMinimum,
      );
      previousMinimum = calculation.minimumRequiredPaise;
    }
  });

  it("uses the immutable original rather than the current total", () => {
    const original = inr("25000");
    const currentTotal = inr("60000");

    expect(calculateMinimumRaise(original).minimumRequiredPaise).toBe(
      inr("2500"),
    );
    expect(currentTotal).toBe(inr("60000"));
  });

  it("quotes one rupee above a tie and never below the listing minimum", () => {
    const quote = calculateTakeoverQuote({
      listingCurrentTotalPaise: inr("8000"),
      targetTotalPaise: inr("10000"),
      minimumRequiredPaise: inr("1000"),
    });

    expect(quote.policyVersion).toBe(POLICY_VERSION);
    expect(quote.neededToExceedPaise).toBe(inr("2001"));
    expect(quote.requiredPaymentPaise).toBe(inr("2001"));

    const floorBoundQuote = calculateTakeoverQuote({
      listingCurrentTotalPaise: inr("10000"),
      targetTotalPaise: inr("10001"),
      minimumRequiredPaise: inr("1000"),
    });
    expect(floorBoundQuote.requiredPaymentPaise).toBe(inr("1000"));
  });

  it("orders by total, reached time, then ID", () => {
    const early = new Date("2026-08-28T10:00:00.000Z");
    const late = new Date("2026-08-28T11:00:00.000Z");
    const rows = [
      {
        id: "b",
        confirmedTotalPaise: inr("10000"),
        currentTotalReachedAt: early,
      },
      {
        id: "a",
        confirmedTotalPaise: inr("10000"),
        currentTotalReachedAt: early,
      },
      {
        id: "c",
        confirmedTotalPaise: inr("10001"),
        currentTotalReachedAt: late,
      },
      {
        id: "d",
        confirmedTotalPaise: inr("10000"),
        currentTotalReachedAt: late,
      },
    ];

    expect(rankSnapshot(rows).map((row) => row.id)).toEqual([
      "c",
      "a",
      "b",
      "d",
    ]);
    expect(compareMainRank(rows[0]!, rows[3]!)).toBe(-1);
    expect(compareMainRank(rows[0]!, rows[0]!)).toBe(0);
    expect(compareMainRank(rows[0]!, rows[1]!)).toBe(1);
    expect(() =>
      compareMainRank(
        { ...rows[0]!, currentTotalReachedAt: new Date("invalid") },
        rows[3]!,
      ),
    ).toThrow(RangeError);
  });

  it("keeps the earlier listing above at a tie and estimates the actual pass", () => {
    const snapshot = [
      {
        id: "a",
        confirmedTotalPaise: inr("10000"),
        currentTotalReachedAt: new Date("2026-08-28T09:00:00.000Z"),
      },
      {
        id: "b",
        confirmedTotalPaise: inr("8000"),
        currentTotalReachedAt: new Date("2026-08-28T08:00:00.000Z"),
      },
    ];
    const confirmationTime = new Date("2026-08-28T10:00:00.000Z");

    expect(
      estimateRank({
        snapshot,
        listingId: "b",
        currentTotalPaise: inr("8000"),
        paymentAmountPaise: inr("2000"),
        hypotheticalReachedAt: confirmationTime,
      }).estimatedRank,
    ).toBe(2n);
    expect(
      estimateRank({
        snapshot,
        listingId: "b",
        currentTotalPaise: inr("8000"),
        paymentAmountPaise: inr("2001"),
        hypotheticalReachedAt: confirmationTime,
      }).estimatedRank,
    ).toBe(1n);
  });

  it("places a listing with an older equal-total reached time above a freshly reversed tie", () => {
    const longstanding = {
      id: "b",
      confirmedTotalPaise: inr("10000"),
      currentTotalReachedAt: new Date("2026-08-27T10:00:00.000Z"),
    };
    const reversedToday = {
      id: "a",
      confirmedTotalPaise: inr("10000"),
      currentTotalReachedAt: new Date("2026-08-28T10:00:00.000Z"),
    };

    expect(
      rankSnapshot([reversedToday, longstanding]).map((row) => row.id),
    ).toEqual(["b", "a"]);
  });

  it("adds distinct settled raises without losing either bigint delta", () => {
    const afterFirst = addMoney(inr("10000"), inr("2000"));
    expect(addMoney(afterFirst, inr("3000"))).toBe(inr("15000"));
  });
});
