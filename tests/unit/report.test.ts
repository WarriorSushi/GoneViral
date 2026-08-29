import { describe, expect, it } from "vitest";

import { REPORT_REASONS, validateReportForm } from "@/domain/report";

function form(overrides: Record<string, string> = {}) {
  const values = {
    email: "Reporter@Example.test ",
    explanation: "This explanation has enough specific detail to review.",
    reason: "scam",
    turnstileToken: "turnstile-proof",
    ...overrides,
  };
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("public abuse report validation", () => {
  it("accepts every documented reason and normalizes optional email", () => {
    for (const reason of REPORT_REASONS) {
      const parsed = validateReportForm(form({ reason }));
      expect(parsed.success).toBe(true);
      if (parsed.success)
        expect(parsed.data.email).toBe("reporter@example.test");
    }
  });

  it("accepts no email while requiring detail and bot proof", () => {
    expect(validateReportForm(form({ email: "" })).success).toBe(true);
    expect(validateReportForm(form({ explanation: "too short" })).success).toBe(
      false,
    );
    expect(validateReportForm(form({ turnstileToken: "" })).success).toBe(
      false,
    );
  });

  it("rejects unknown reasons and malformed email", () => {
    expect(validateReportForm(form({ reason: "popularity" })).success).toBe(
      false,
    );
    expect(validateReportForm(form({ email: "not-an-email" })).success).toBe(
      false,
    );
  });
});
