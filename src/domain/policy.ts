export const POLICY_VERSION = "2026-08-28-v1" as const;
export const BUSINESS_TIME_ZONE = "Asia/Kolkata" as const;
export const CURRENCY = "INR" as const;

export const PAYMENT_GRANULARITY_PAISE = 100n;
export const INITIAL_SPONSORSHIP_MIN_PAISE = 49_900n;
export const RAISE_PERCENT_NUMERATOR = 10n;
export const RAISE_PERCENT_DENOMINATOR = 100n;
export const RAISE_ABSOLUTE_FLOOR_PAISE = 100_000n;
export const TAKEOVER_INCREMENT_PAISE = 100n;

export const LISTING_NAME_MAX_GRAPHEMES = 80;
export const LISTING_TAGLINE_MAX_GRAPHEMES = 160;
export const DESTINATION_URL_MAX_BYTES = 2_048;
export const LOGO_UPLOAD_MAX_BYTES = 2_097_152;
export const PAYMENT_ATTEMPT_EXPIRY_MINUTES = 30;
export const PENDING_STATUS_ACTIVE_POLL_SECONDS = 60;

export const SPONSORSHIP_POLICY = Object.freeze({
  version: POLICY_VERSION,
  businessTimeZone: BUSINESS_TIME_ZONE,
  currency: CURRENCY,
  paymentGranularityPaise: PAYMENT_GRANULARITY_PAISE,
  initialSponsorshipMinPaise: INITIAL_SPONSORSHIP_MIN_PAISE,
  raisePercentNumerator: RAISE_PERCENT_NUMERATOR,
  raisePercentDenominator: RAISE_PERCENT_DENOMINATOR,
  raiseAbsoluteFloorPaise: RAISE_ABSOLUTE_FLOOR_PAISE,
  takeoverIncrementPaise: TAKEOVER_INCREMENT_PAISE,
  listingNameMaxGraphemes: LISTING_NAME_MAX_GRAPHEMES,
  listingTaglineMaxGraphemes: LISTING_TAGLINE_MAX_GRAPHEMES,
  destinationUrlMaxBytes: DESTINATION_URL_MAX_BYTES,
  logoUploadMaxBytes: LOGO_UPLOAD_MAX_BYTES,
  paymentAttemptExpiryMinutes: PAYMENT_ATTEMPT_EXPIRY_MINUTES,
  pendingStatusActivePollSeconds: PENDING_STATUS_ACTIVE_POLL_SECONDS,
});

export type PolicyVersion = typeof POLICY_VERSION;
export type SupportedCurrency = typeof CURRENCY;
