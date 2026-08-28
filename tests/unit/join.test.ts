import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { validateJoinForm } from "@/domain/join";
import { INITIAL_SPONSORSHIP_MAX_PAISE } from "@/domain/policy";

function validForm(overrides: Record<string, string> = {}) {
  const values = {
    amount: "499",
    category: "tech-apps",
    destination: "https://example.com/product",
    email: "Owner@Example.com",
    idempotencyKey: randomUUID(),
    name: "Example Product",
    phone: "+919876543210",
    tagline: "A useful product for small teams",
    termsAccepted: "yes",
    turnstileToken: `local-pass-${randomUUID()}`,
    ...overrides,
  };
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("guest join validation", () => {
  it("normalizes private contact fields and parses whole INR", () => {
    const result = validateJoinForm(validForm());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.email).toBe("owner@example.com");
      expect(result.value.amountPaise).toBe(49_900n);
      expect(result.value.phone).toBe("+919876543210");
    }
  });

  it.each([
    ["498", "amount"],
    [(INITIAL_SPONSORSHIP_MAX_PAISE / 100n + 1n).toString(), "amount"],
    ["499.01", "amount"],
  ])("rejects tampered amount %s", (amount, field) => {
    const result = validateJoinForm(validForm({ amount }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toHaveProperty(field);
  });

  it.each(["9876543210", "+00000000", "+91 9876543210"])(
    "rejects invalid provider phone %s",
    (phone) => {
      const result = validateJoinForm(validForm({ phone }));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.phone).toBeDefined();
    },
  );

  it("rejects invalid email, policy acceptance, and category together", () => {
    const result = validateJoinForm(
      validForm({
        category: "secret",
        email: "not-email",
        termsAccepted: "no",
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.email).toBeDefined();
      expect(result.errors.category).toBeDefined();
      expect(result.errors.terms).toBeDefined();
    }
  });
});
