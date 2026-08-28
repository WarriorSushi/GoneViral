import { parseWholeInr, type MoneyPaise } from "./money";
import { INITIAL_SPONSORSHIP_MAX_PAISE } from "./policy";

export type RaiseField = "amount" | "form" | "phone" | "target";

export type RaiseInput = Readonly<{
  amountPaise: MoneyPaise;
  applicationIdempotencyKey: string;
  phone: string;
  targetSlug: string | null;
}>;

export type RaiseValidation =
  | Readonly<{ ok: true; value: RaiseInput }>
  | Readonly<{ errors: Partial<Record<RaiseField, string>>; ok: false }>;

function value(formData: FormData, key: string): string {
  const candidate = formData.get(key);
  return typeof candidate === "string" ? candidate.trim() : "";
}

export function validateRaiseForm(formData: FormData): RaiseValidation {
  const amount = parseWholeInr(value(formData, "amount"));
  const phone = value(formData, "phone");
  const targetSlug = value(formData, "targetSlug") || null;
  const applicationIdempotencyKey = value(formData, "idempotencyKey");
  const errors: Partial<Record<RaiseField, string>> = {};

  if (
    !amount.ok ||
    amount.value <= 0n ||
    amount.value > INITIAL_SPONSORSHIP_MAX_PAISE
  ) {
    errors.amount = "Enter a whole-rupee amount within the checkout limit.";
  }
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    errors.phone = "Use an international phone number, such as +919876543210.";
  }
  if (targetSlug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(targetSlug)) {
    errors.target = "Choose a current leaderboard target.";
  }
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      applicationIdempotencyKey,
    )
  ) {
    errors.form = "Refresh this page and try again.";
  }
  if (!amount.ok || Object.keys(errors).length > 0)
    return { errors, ok: false };
  return {
    ok: true,
    value: {
      amountPaise: amount.value,
      applicationIdempotencyKey,
      phone,
      targetSlug,
    },
  };
}
