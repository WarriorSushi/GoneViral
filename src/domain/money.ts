import { PAYMENT_GRANULARITY_PAISE } from "./policy";
import { domainFailure, domainSuccess, type DomainResult } from "./result";

declare const moneyPaiseBrand: unique symbol;

export type MoneyPaise = bigint & {
  readonly [moneyPaiseBrand]: "MoneyPaise";
};

export const POSTGRES_BIGINT_MAX = 9_223_372_036_854_775_807n;
export const POSTGRES_BIGINT_MIN = -9_223_372_036_854_775_808n;

export type MoneyParseErrorCode = "MONEY_INVALID_FORMAT" | "MONEY_OUT_OF_RANGE";

const maximumWholeRupeesText = (
  POSTGRES_BIGINT_MAX / PAYMENT_GRANULARITY_PAISE
).toString();
const postgresBigintMaximumText = POSTGRES_BIGINT_MAX.toString();
const postgresBigintMinimumAbsoluteText = (-POSTGRES_BIGINT_MIN).toString();

function isUnsignedDecimalAboveLimit(input: string, limit: string): boolean {
  const normalized = input.replace(/^0+(?=\d)/, "");

  return (
    normalized.length > limit.length ||
    (normalized.length === limit.length && normalized > limit)
  );
}

function isPostgresBigint(value: bigint): boolean {
  return value >= POSTGRES_BIGINT_MIN && value <= POSTGRES_BIGINT_MAX;
}

export function moneyPaise(value: bigint): MoneyPaise {
  if (!isPostgresBigint(value)) {
    throw new RangeError("Money value exceeds PostgreSQL signed bigint range.");
  }

  return value as MoneyPaise;
}

export function parseWholeInr(
  input: string,
): DomainResult<MoneyPaise, MoneyParseErrorCode> {
  if (!/^\d+$/.test(input)) {
    return domainFailure("MONEY_INVALID_FORMAT");
  }

  if (isUnsignedDecimalAboveLimit(input, maximumWholeRupeesText)) {
    return domainFailure("MONEY_OUT_OF_RANGE");
  }

  const rupees = BigInt(input);
  return domainSuccess(moneyPaise(rupees * PAYMENT_GRANULARITY_PAISE));
}

export function parseMoneyPaiseJson(
  input: string,
): DomainResult<MoneyPaise, MoneyParseErrorCode> {
  if (!/^(?:0|[1-9]\d*|-[1-9]\d*)$/.test(input)) {
    return domainFailure("MONEY_INVALID_FORMAT");
  }

  const isNegative = input.startsWith("-");
  const absoluteDigits = isNegative ? input.slice(1) : input;
  const limit = isNegative
    ? postgresBigintMinimumAbsoluteText
    : postgresBigintMaximumText;

  if (isUnsignedDecimalAboveLimit(absoluteDigits, limit)) {
    return domainFailure("MONEY_OUT_OF_RANGE");
  }

  const value = BigInt(input);
  return domainSuccess(moneyPaise(value));
}

export function serializeMoneyPaise(value: MoneyPaise): string {
  return value.toString(10);
}

export function addMoney(left: MoneyPaise, right: MoneyPaise): MoneyPaise {
  return moneyPaise(left + right);
}

export function subtractMoney(left: MoneyPaise, right: MoneyPaise): MoneyPaise {
  return moneyPaise(left - right);
}

export function compareMoney(left: MoneyPaise, right: MoneyPaise): -1 | 0 | 1 {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

export function maxMoney(left: MoneyPaise, right: MoneyPaise): MoneyPaise {
  return left >= right ? left : right;
}

export function ceilDiv(dividend: bigint, divisor: bigint): bigint {
  if (dividend < 0n || divisor <= 0n) {
    throw new RangeError(
      "ceilDiv requires a non-negative dividend and positive divisor.",
    );
  }

  return (dividend + divisor - 1n) / divisor;
}

export function isWholeRupee(value: MoneyPaise): boolean {
  return value % PAYMENT_GRANULARITY_PAISE === 0n;
}

function formatIndianInteger(digits: string): string {
  if (digits.length <= 3) {
    return digits;
  }

  const lastThree = digits.slice(-3);
  const leading = digits.slice(0, -3);
  const pairs: string[] = [];

  for (let end = leading.length; end > 0; end -= 2) {
    pairs.unshift(leading.slice(Math.max(0, end - 2), end));
  }

  return `${pairs.join(",")},${lastThree}`;
}

export function formatInr(value: MoneyPaise): string {
  const isNegative = value < 0n;
  const absolute = isNegative ? -value : value;
  const rupees = absolute / PAYMENT_GRANULARITY_PAISE;
  const paise = absolute % PAYMENT_GRANULARITY_PAISE;
  const sign = isNegative ? "-" : "";
  const fraction = paise === 0n ? "" : `.${paise.toString().padStart(2, "0")}`;

  return `${sign}₹${formatIndianInteger(rupees.toString())}${fraction}`;
}

export function toProviderInrAmount(value: MoneyPaise): string {
  if (value < 0n) {
    throw new RangeError("Provider payment amounts cannot be negative.");
  }

  const rupees = value / PAYMENT_GRANULARITY_PAISE;
  const paise = value % PAYMENT_GRANULARITY_PAISE;
  return `${rupees}.${paise.toString().padStart(2, "0")}`;
}

export function parseProviderInrAmount(
  input: string,
): DomainResult<MoneyPaise, MoneyParseErrorCode> {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(input);

  if (!match) {
    return domainFailure("MONEY_INVALID_FORMAT");
  }

  const rupeeDigits = match[1]!;

  if (isUnsignedDecimalAboveLimit(rupeeDigits, maximumWholeRupeesText)) {
    return domainFailure("MONEY_OUT_OF_RANGE");
  }

  const rupeePart = BigInt(rupeeDigits);
  const paisePart = BigInt((match[2] ?? "").padEnd(2, "0") || "0");

  const value = rupeePart * PAYMENT_GRANULARITY_PAISE + paisePart;

  if (value > POSTGRES_BIGINT_MAX) {
    return domainFailure("MONEY_OUT_OF_RANGE");
  }

  return domainSuccess(moneyPaise(value));
}
