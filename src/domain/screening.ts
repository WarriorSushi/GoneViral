export const SCREENING_RULESET_VERSION = "2026-08-29-v1" as const;

const prohibitedPatterns = [
  /\b(?:child sexual|csam)\b/i,
  /\b(?:buy|sell)\s+(?:drugs?|weapons?|stolen)\b/i,
  /\bphishing\b/i,
  /\b(?:nazi|terrorist)\s+(?:shop|fund|group)\b/i,
];

const reviewPatterns = [
  /\bguaranteed\s+(?:profit|returns?|income)\b/i,
  /\bmiracle\s+(?:cure|treatment)\b/i,
  /\b(?:crypto|forex)\s+(?:signals?|scheme)\b/i,
  /\bget rich quick\b/i,
];

export type ScreeningDecision = Readonly<{
  reasonCodes: readonly string[];
  rulesetVersion: typeof SCREENING_RULESET_VERSION;
  status: "clear" | "pending_review" | "rejected";
}>;

export function screenSubmission(input: {
  name: string;
  tagline: string;
  destinationHost: string;
}): ScreeningDecision {
  const searchable = `${input.name}\n${input.tagline}\n${input.destinationHost}`;
  if (prohibitedPatterns.some((pattern) => pattern.test(searchable))) {
    return {
      reasonCodes: ["PROHIBITED_CONTENT"],
      rulesetVersion: SCREENING_RULESET_VERSION,
      status: "rejected",
    };
  }
  if (reviewPatterns.some((pattern) => pattern.test(searchable))) {
    return {
      reasonCodes: ["CLAIMS_REQUIRE_REVIEW"],
      rulesetVersion: SCREENING_RULESET_VERSION,
      status: "pending_review",
    };
  }
  return {
    reasonCodes: [],
    rulesetVersion: SCREENING_RULESET_VERSION,
    status: "clear",
  };
}
