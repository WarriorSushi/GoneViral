import { describe, expect, it } from "vitest";
import {
  POSTGRES_BIGINT_MAX,
  addMoney,
  ceilDiv,
  compareMoney,
  formatInr,
  isWholeRupee,
  maxMoney,
  moneyPaise,
  parseMoneyPaiseJson,
  parseProviderInrAmount,
  parseWholeInr,
  serializeMoneyPaise,
  subtractMoney,
  toProviderInrAmount,
} from "@/domain/money";

function wholeInr(input: string) {
  const result = parseWholeInr(input);
  expect(result.ok).toBe(true);

  if (!result.ok) {
    throw new Error(result.code);
  }

  return result.value;
}

describe("money domain", () => {
  it("parses whole INR exactly as bigint paise", () => {
    expect(wholeInr("499")).toBe(49_900n);
    expect(wholeInr("000499")).toBe(49_900n);

    const beyondSafeInteger = wholeInr("9007199254740992");
    expect(beyondSafeInteger).toBe(900_719_925_474_099_200n);
    expect(serializeMoneyPaise(beyondSafeInteger)).toBe("900719925474099200");
  });

  it.each(["", "-1", "+1", " 499", "499 ", "1.00", "1e3", "0x10", "₹499"])(
    "rejects non-digit customer input %s",
    (input) => {
      expect(parseWholeInr(input)).toEqual({
        ok: false,
        code: "MONEY_INVALID_FORMAT",
      });
    },
  );

  it("rejects values that overflow PostgreSQL signed bigint paise", () => {
    expect(parseWholeInr("92233720368547758")).toEqual({
      ok: true,
      value: 9_223_372_036_854_775_800n,
    });
    expect(parseWholeInr("92233720368547759")).toEqual({
      ok: false,
      code: "MONEY_OUT_OF_RANGE",
    });
    expect(parseWholeInr("9".repeat(10_000))).toEqual({
      ok: false,
      code: "MONEY_OUT_OF_RANGE",
    });
    expect(() => moneyPaise(POSTGRES_BIGINT_MAX + 1n)).toThrow(RangeError);
  });

  it("round-trips canonical signed JSON money strings", () => {
    expect(parseMoneyPaiseJson("0")).toEqual({ ok: true, value: 0n });
    expect(parseMoneyPaiseJson("-100")).toEqual({ ok: true, value: -100n });
    expect(parseMoneyPaiseJson("01")).toEqual({
      ok: false,
      code: "MONEY_INVALID_FORMAT",
    });
    expect(parseMoneyPaiseJson("-0")).toEqual({
      ok: false,
      code: "MONEY_INVALID_FORMAT",
    });
    expect(parseMoneyPaiseJson("9223372036854775808")).toEqual({
      ok: false,
      code: "MONEY_OUT_OF_RANGE",
    });
  });

  it("performs checked bigint arithmetic and ceiling division", () => {
    const first = moneyPaise(10_000n);
    const second = moneyPaise(2_500n);

    expect(addMoney(first, second)).toBe(12_500n);
    expect(subtractMoney(first, second)).toBe(7_500n);
    expect(compareMoney(first, second)).toBe(1);
    expect(compareMoney(second, first)).toBe(-1);
    expect(compareMoney(first, first)).toBe(0);
    expect(maxMoney(first, second)).toBe(first);
    expect(ceilDiv(10_001n, 1_000n)).toBe(11n);
    expect(ceilDiv(10_000n, 1_000n)).toBe(10n);
    expect(() => ceilDiv(-1n, 100n)).toThrow(RangeError);
  });

  it("formats INR with deterministic Indian grouping", () => {
    expect(formatInr(moneyPaise(49_900n))).toBe("₹499");
    expect(formatInr(moneyPaise(10_000_000n))).toBe("₹1,00,000");
    expect(formatInr(moneyPaise(12_345_678_900n))).toBe("₹12,34,56,789");
    expect(formatInr(moneyPaise(-100_050n))).toBe("-₹1,000.50");
  });

  it("converts provider decimal strings without floating point", () => {
    expect(parseProviderInrAmount("499")).toEqual({
      ok: true,
      value: 49_900n,
    });
    expect(parseProviderInrAmount("499.00")).toEqual({
      ok: true,
      value: 49_900n,
    });
    expect(parseProviderInrAmount("499.5")).toEqual({
      ok: true,
      value: 49_950n,
    });
    expect(parseProviderInrAmount("499.001")).toEqual({
      ok: false,
      code: "MONEY_INVALID_FORMAT",
    });
    expect(toProviderInrAmount(moneyPaise(49_900n))).toBe("499.00");
    expect(() => toProviderInrAmount(moneyPaise(-100n))).toThrow(RangeError);
    expect(isWholeRupee(moneyPaise(49_950n))).toBe(false);
    expect(parseProviderInrAmount("92233720368547759")).toEqual({
      ok: false,
      code: "MONEY_OUT_OF_RANGE",
    });
    expect(parseProviderInrAmount("92233720368547758.99")).toEqual({
      ok: false,
      code: "MONEY_OUT_OF_RANGE",
    });
  });
});
