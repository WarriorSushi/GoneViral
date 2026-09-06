import { describe, expect, it } from "vitest";

import { paymentStatus } from "@/app/admin/payment-status";

describe("admin payment status", () => {
  it("reports live payments only when both production controls are enabled", () => {
    expect(paymentStatus("live_mode", true, true)).toEqual({
      active: true,
      appEnabled: true,
      kind: "live",
    });
    expect(paymentStatus("live_mode", true, false).active).toBe(false);
    expect(paymentStatus("live_mode", false, true).active).toBe(false);
  });

  it("keeps Preview in test terminology and local mock independent of Vercel", () => {
    expect(paymentStatus("test_mode", true, true).kind).toBe("test");
    expect(paymentStatus("mock", false, true)).toEqual({
      active: true,
      appEnabled: true,
      kind: "mock",
    });
  });
});
