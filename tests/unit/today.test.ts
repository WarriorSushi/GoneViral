import { describe, expect, it } from "vitest";
import { moneyPaise, parseWholeInr } from "@/domain/money";
import {
  applyDailyDelta,
  businessDayUtcBounds,
  compareTodayRank,
  isTodayEligible,
  sumTodayNet,
  toIstBusinessDate,
} from "@/domain/today";

function inr(rupees: string) {
  const parsed = parseWholeInr(rupees);

  if (!parsed.ok) {
    throw new Error(parsed.code);
  }

  return parsed.value;
}

describe("IST business dates and Today ranking", () => {
  it("switches business date exactly at midnight IST", () => {
    expect(toIstBusinessDate("2026-08-28T18:29:59.999Z")).toBe("2026-08-28");
    expect(toIstBusinessDate("2026-08-28T18:30:00.000Z")).toBe("2026-08-29");
    expect(() => toIstBusinessDate("2026-08-28T18:30:00")).toThrow(RangeError);
    expect(() => toIstBusinessDate("not-a-dateZ")).toThrow(RangeError);
  });

  it("handles leap dates and fixed-offset boundaries without DST", () => {
    expect(toIstBusinessDate("2024-02-29T18:29:59.999Z")).toBe("2024-02-29");
    expect(toIstBusinessDate("2024-02-29T18:30:00.000Z")).toBe("2024-03-01");

    expect(businessDayUtcBounds("2024-02-29")).toEqual({
      businessDate: "2024-02-29",
      startInclusive: new Date("2024-02-28T18:30:00.000Z"),
      endExclusive: new Date("2024-02-29T18:30:00.000Z"),
    });
    expect(
      businessDayUtcBounds("2026-06-01").startInclusive.toISOString(),
    ).toBe("2026-05-31T18:30:00.000Z");
    expect(
      businessDayUtcBounds("2026-12-01").startInclusive.toISOString(),
    ).toBe("2026-11-30T18:30:00.000Z");
    expect(() => businessDayUtcBounds("2023-02-29")).toThrow(RangeError);
    expect(() => businessDayUtcBounds("2026/08/28")).toThrow(RangeError);
  });

  it("applies positive and negative deltas on their application date", () => {
    const first = applyDailyDelta({
      previousNetPaise: moneyPaise(0n),
      deltaPaise: inr("5000"),
      appliedAt: "2026-08-28T18:29:00.000Z",
    });
    const reversal = applyDailyDelta({
      previousNetPaise: first.currentNetPaise,
      deltaPaise: moneyPaise(-100_000n),
      appliedAt: "2026-08-28T18:29:30.000Z",
    });

    expect(reversal.businessDate).toBe("2026-08-28");
    expect(reversal.currentNetPaise).toBe(inr("4000"));
    expect(sumTodayNet([inr("5000"), moneyPaise(-100_000n)])).toBe(inr("4000"));
    expect(isTodayEligible(reversal.currentNetPaise)).toBe(true);
    expect(isTodayEligible(moneyPaise(0n))).toBe(false);
  });

  it("orders Today by net amount, attainment time, then listing ID", () => {
    const early = new Date("2026-08-28T10:00:00.000Z");
    const late = new Date("2026-08-28T11:00:00.000Z");
    const rows = [
      {
        listingId: "a",
        todayNetPaise: inr("4000"),
        todayTotalReachedAt: early,
      },
      { listingId: "b", todayNetPaise: inr("4500"), todayTotalReachedAt: late },
      { listingId: "d", todayNetPaise: inr("4000"), todayTotalReachedAt: late },
      {
        listingId: "c",
        todayNetPaise: inr("4000"),
        todayTotalReachedAt: early,
      },
    ];

    expect(
      [...rows].sort(compareTodayRank).map((row) => row.listingId),
    ).toEqual(["b", "a", "c", "d"]);
    expect(compareTodayRank(rows[0]!, rows[0]!)).toBe(0);
    expect(compareTodayRank(rows[3]!, rows[0]!)).toBe(1);
    expect(() =>
      compareTodayRank(
        { ...rows[0]!, todayTotalReachedAt: new Date("invalid") },
        rows[0]!,
      ),
    ).toThrow(RangeError);
  });
});
