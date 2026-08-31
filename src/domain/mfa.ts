export type AuthenticatorLevel = string | null;

export type MfaFlowMode = "challenge" | "enroll" | "verified";

export function determineMfaFlow(input: {
  currentLevel: AuthenticatorLevel;
  forceChallenge?: boolean;
  nextLevel: AuthenticatorLevel;
  verifiedTotpFactorCount: number;
}): MfaFlowMode {
  if (
    input.forceChallenge &&
    (input.nextLevel === "aal2" || input.verifiedTotpFactorCount > 0)
  ) {
    return "challenge";
  }
  if (input.currentLevel === "aal2" && input.nextLevel === "aal2") {
    return "verified";
  }
  if (input.nextLevel === "aal2" || input.verifiedTotpFactorCount > 0) {
    return "challenge";
  }
  return "enroll";
}

export function isValidTotpCode(value: string): boolean {
  return /^\d{6}$/.test(value);
}
