import { addMoney, moneyPaise, type MoneyPaise } from "./money";
import { BUSINESS_TIME_ZONE, POLICY_VERSION } from "./policy";

declare const businessDateBrand: unique symbol;

export type BusinessDate = string & {
  readonly [businessDateBrand]: "BusinessDate";
};

export type DailyDeltaCalculation = Readonly<{
  policyVersion: typeof POLICY_VERSION;
  businessTimeZone: typeof BUSINESS_TIME_ZONE;
  businessDate: BusinessDate;
  previousNetPaise: MoneyPaise;
  deltaPaise: MoneyPaise;
  currentNetPaise: MoneyPaise;
  totalReachedAt: Date;
}>;

export type TodayRankableListing = Readonly<{
  listingId: string;
  todayNetPaise: MoneyPaise;
  todayTotalReachedAt: Date;
}>;

const IST_OFFSET_MILLISECONDS = 19_800_000;
const DAY_MILLISECONDS = 86_400_000;

function requireValidInstant(value: string | Date): Date {
  if (typeof value === "string" && !/Z$/i.test(value)) {
    throw new RangeError("UTC timestamp strings must end with Z.");
  }

  const instant =
    value instanceof Date ? new Date(value.getTime()) : new Date(value);

  if (!Number.isFinite(instant.getTime())) {
    throw new RangeError("A valid timestamp is required.");
  }

  return instant;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

export function toIstBusinessDate(utcInstant: string | Date): BusinessDate {
  const instant = requireValidInstant(utcInstant);
  const istWallClock = new Date(instant.getTime() + IST_OFFSET_MILLISECONDS);
  const date = `${istWallClock.getUTCFullYear()}-${pad(
    istWallClock.getUTCMonth() + 1,
  )}-${pad(istWallClock.getUTCDate())}`;

  return date as BusinessDate;
}

function requireBusinessDate(value: string): BusinessDate {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RangeError("Business date must use YYYY-MM-DD.");
  }

  const midnightUtc = new Date(`${value}T00:00:00.000Z`);

  if (
    !Number.isFinite(midnightUtc.getTime()) ||
    midnightUtc.toISOString().slice(0, 10) !== value
  ) {
    throw new RangeError("Business date must be a real calendar date.");
  }

  return value as BusinessDate;
}

export function businessDayUtcBounds(businessDate: string): Readonly<{
  businessDate: BusinessDate;
  startInclusive: Date;
  endExclusive: Date;
}> {
  const validDate = requireBusinessDate(businessDate);
  const localMidnightAsUtc = new Date(`${validDate}T00:00:00.000Z`);
  const startInclusive = new Date(
    localMidnightAsUtc.getTime() - IST_OFFSET_MILLISECONDS,
  );
  const endExclusive = new Date(startInclusive.getTime() + DAY_MILLISECONDS);

  return { businessDate: validDate, startInclusive, endExclusive };
}

export function applyDailyDelta(input: {
  previousNetPaise: MoneyPaise;
  deltaPaise: MoneyPaise;
  appliedAt: string | Date;
}): DailyDeltaCalculation {
  const totalReachedAt = requireValidInstant(input.appliedAt);

  return {
    policyVersion: POLICY_VERSION,
    businessTimeZone: BUSINESS_TIME_ZONE,
    businessDate: toIstBusinessDate(totalReachedAt),
    previousNetPaise: input.previousNetPaise,
    deltaPaise: input.deltaPaise,
    currentNetPaise: addMoney(input.previousNetPaise, input.deltaPaise),
    totalReachedAt,
  };
}

export function sumTodayNet(deltas: readonly MoneyPaise[]): MoneyPaise {
  return deltas.reduce(addMoney, moneyPaise(0n));
}

export function isTodayEligible(todayNetPaise: MoneyPaise): boolean {
  return todayNetPaise > 0n;
}

export function compareTodayRank(
  left: TodayRankableListing,
  right: TodayRankableListing,
): -1 | 0 | 1 {
  if (left.todayNetPaise > right.todayNetPaise) {
    return -1;
  }

  if (left.todayNetPaise < right.todayNetPaise) {
    return 1;
  }

  const leftTime = left.todayTotalReachedAt.getTime();
  const rightTime = right.todayTotalReachedAt.getTime();

  if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) {
    throw new RangeError("Today ranking timestamps must be valid dates.");
  }

  if (leftTime < rightTime) {
    return -1;
  }

  if (leftTime > rightTime) {
    return 1;
  }

  if (left.listingId < right.listingId) {
    return -1;
  }

  if (left.listingId > right.listingId) {
    return 1;
  }

  return 0;
}
