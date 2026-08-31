import { describe, expect, it } from "vitest";

import { determineMfaFlow, isValidTotpCode } from "@/domain/mfa";

describe("MFA flow selection", () => {
  it("enrolls only when no verified factor exists", () => {
    expect(
      determineMfaFlow({
        currentLevel: "aal1",
        nextLevel: "aal1",
        verifiedTotpFactorCount: 0,
      }),
    ).toBe("enroll");
  });

  it("challenges a verified factor before sensitive access", () => {
    expect(
      determineMfaFlow({
        currentLevel: "aal1",
        nextLevel: "aal2",
        verifiedTotpFactorCount: 1,
      }),
    ).toBe("challenge");
  });

  it("accepts only an AAL2 session as verified", () => {
    expect(
      determineMfaFlow({
        currentLevel: "aal2",
        nextLevel: "aal2",
        verifiedTotpFactorCount: 1,
      }),
    ).toBe("verified");
  });

  it("re-challenges an existing AAL2 factor for fresh admin access", () => {
    expect(
      determineMfaFlow({
        currentLevel: "aal2",
        forceChallenge: true,
        nextLevel: "aal2",
        verifiedTotpFactorCount: 1,
      }),
    ).toBe("challenge");
  });

  it.each(["", "12345", "1234567", "abcdef", "12 345"])(
    "rejects invalid TOTP input %j",
    (code) => expect(isValidTotpCode(code)).toBe(false),
  );

  it("accepts a six-digit TOTP input", () => {
    expect(isValidTotpCode("123456")).toBe(true);
  });
});
