import { describe, expect, it } from "vitest";

import { hasAdminPermission } from "@/server/admin/permissions";

describe("admin role permissions", () => {
  it("keeps reviewer access non-financial and non-destructive", () => {
    expect(hasAdminPermission("reviewer", "reports:view")).toBe(true);
    expect(hasAdminPermission("reviewer", "listings:moderate")).toBe(true);
    expect(hasAdminPermission("reviewer", "listings:remove")).toBe(false);
    expect(hasAdminPermission("reviewer", "payments:view")).toBe(false);
    expect(hasAdminPermission("reviewer", "payments:refund")).toBe(false);
    expect(hasAdminPermission("reviewer", "flags:manage")).toBe(false);
  });

  it("grants operations destructive and financial workflows but not flags", () => {
    expect(hasAdminPermission("operations", "listings:remove")).toBe(true);
    expect(hasAdminPermission("operations", "requests:reassign")).toBe(true);
    expect(hasAdminPermission("operations", "payments:refund")).toBe(true);
    expect(hasAdminPermission("operations", "flags:manage")).toBe(false);
  });

  it("reserves operational flags for super admins", () => {
    expect(hasAdminPermission("super_admin", "flags:manage")).toBe(true);
    expect(hasAdminPermission("super_admin", "payments:refund")).toBe(true);
  });
});
