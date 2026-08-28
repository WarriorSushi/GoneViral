import { formatInr, moneyPaise } from "@/domain/money";

export function Money({ paise }: { readonly paise: string }) {
  const formatted = formatInr(moneyPaise(BigInt(paise)));
  return (
    <span className="money" aria-label={`${formatted} Indian rupees`}>
      {formatted}
    </span>
  );
}
