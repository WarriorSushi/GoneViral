import { canonicalizeDestination, type SafeDestination } from "./destination";
import { parseWholeInr, type MoneyPaise } from "./money";
import {
  INITIAL_SPONSORSHIP_MAX_PAISE,
  INITIAL_SPONSORSHIP_MIN_PAISE,
  LISTING_NAME_MAX_GRAPHEMES,
  LISTING_TAGLINE_MAX_GRAPHEMES,
  POLICY_VERSION,
} from "./policy";
import {
  CONTENT_POLICY_VERSION,
  PRIVACY_VERSION,
  REFUND_POLICY_VERSION,
  TERMS_VERSION,
} from "../config/legal";

export {
  CONTENT_POLICY_VERSION,
  PRIVACY_VERSION,
  REFUND_POLICY_VERSION,
  TERMS_VERSION,
};

const categorySlugs = new Set([
  "people-creators",
  "tech-apps",
  "brands-d2c",
  "b2b-services",
  "media-entertainment",
  "other",
]);
const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });

export type JoinField =
  | "amount"
  | "category"
  | "destination"
  | "email"
  | "form"
  | "name"
  | "phone"
  | "tagline"
  | "terms"
  | "turnstile";

export type JoinInput = Readonly<{
  amountPaise: MoneyPaise;
  applicationIdempotencyKey: string;
  categorySlug: string;
  destination: SafeDestination;
  email: string;
  name: string;
  phone: string;
  policyVersion: typeof POLICY_VERSION;
  tagline: string;
  targetSlug: string | null;
  turnstileToken: string;
}>;

export type JoinValidation =
  | Readonly<{ ok: true; value: JoinInput }>
  | Readonly<{ errors: Partial<Record<JoinField, string>>; ok: false }>;

function graphemeCount(value: string): number {
  return [...segmenter.segment(value)].length;
}

function value(formData: FormData, key: string): string {
  const candidate = formData.get(key);
  return typeof candidate === "string" ? candidate.trim() : "";
}

export function validateJoinForm(formData: FormData): JoinValidation {
  const name = value(formData, "name");
  const tagline = value(formData, "tagline");
  const email = value(formData, "email").toLowerCase();
  const phone = value(formData, "phone");
  const categorySlug = value(formData, "category");
  const applicationIdempotencyKey = value(formData, "idempotencyKey");
  const turnstileToken = value(formData, "turnstileToken");
  const targetSlug = value(formData, "targetSlug") || null;
  const amount = parseWholeInr(value(formData, "amount"));
  const destination = canonicalizeDestination(value(formData, "destination"));
  const errors: Partial<Record<JoinField, string>> = {};

  if (!name || graphemeCount(name) > LISTING_NAME_MAX_GRAPHEMES) {
    errors.name = `Enter a name of ${LISTING_NAME_MAX_GRAPHEMES} characters or fewer.`;
  }
  if (!tagline || graphemeCount(tagline) > LISTING_TAGLINE_MAX_GRAPHEMES) {
    errors.tagline = `Enter a tagline of ${LISTING_TAGLINE_MAX_GRAPHEMES} characters or fewer.`;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    errors.email = "Enter a valid email address.";
  }
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    errors.phone = "Use an international phone number, such as +919876543210.";
  }
  if (!categorySlugs.has(categorySlug)) {
    errors.category = "Choose a category.";
  }
  if (targetSlug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(targetSlug)) {
    errors.form = "That takeover target is invalid.";
  }
  if (!destination.ok) {
    errors.destination =
      "Enter a direct, public HTTPS website URL. Private addresses and short links are not accepted.";
  }
  if (
    !amount.ok ||
    amount.value < INITIAL_SPONSORSHIP_MIN_PAISE ||
    amount.value > INITIAL_SPONSORSHIP_MAX_PAISE
  ) {
    errors.amount = "Enter a whole-rupee amount from ₹499 to ₹2,14,74,836.";
  }
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      applicationIdempotencyKey,
    )
  ) {
    errors.form = "Refresh this page and try again.";
  }
  if (!turnstileToken || turnstileToken.length > 2_048) {
    errors.turnstile = "Complete the security check.";
  }
  if (value(formData, "termsAccepted") !== "yes") {
    errors.terms = "Accept the terms and policies to continue.";
  }

  if (Object.keys(errors).length > 0 || !amount.ok || !destination.ok) {
    return { errors, ok: false };
  }

  return {
    ok: true,
    value: {
      amountPaise: amount.value,
      applicationIdempotencyKey,
      categorySlug,
      destination: destination.value,
      email,
      name,
      phone,
      policyVersion: POLICY_VERSION,
      tagline,
      targetSlug,
      turnstileToken,
    },
  };
}
