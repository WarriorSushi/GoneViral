import { describe, expect, it } from "vitest";

import { validateRaiseForm } from "@/domain/raise";

function form(amount: string, phone = "+919876543210") {
  const data = new FormData();
  data.set("amount", amount);
  data.set("phone", phone);
  data.set("idempotencyKey", "123e4567-e89b-42d3-a456-426614174000");
  return data;
}

describe("raise form money boundary", () => {
  it("accepts only whole INR and preserves paise internally", () => {
    const result = validateRaiseForm(form("1001"));
    expect(result.ok && result.value.amountPaise).toBe(100_100n);
  });

  it.each(["1000.10", "1e3", "-1000", "+1000"])(
    "rejects non-whole input %s",
    (amount) => expect(validateRaiseForm(form(amount)).ok).toBe(false),
  );

  it("rejects a client-chosen unsafe target", () => {
    const data = form("1000");
    data.set("targetSlug", "//outside.example");
    expect(validateRaiseForm(data)).toMatchObject({
      errors: { target: "Choose a current leaderboard target." },
      ok: false,
    });
  });
});
