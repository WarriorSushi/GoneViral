export type AdminRole = "operations" | "reviewer" | "super_admin";

export type AdminPermission =
  | "flags:manage"
  | "listings:moderate"
  | "listings:remove"
  | "listings:view"
  | "payments:refund"
  | "payments:view"
  | "reports:view"
  | "requests:review"
  | "requests:reassign"
  | "safe_email:resend";

const permissions: Record<AdminRole, ReadonlySet<AdminPermission>> = {
  reviewer: new Set([
    "listings:moderate",
    "listings:view",
    "reports:view",
    "requests:review",
    "safe_email:resend",
  ]),
  operations: new Set([
    "listings:moderate",
    "listings:remove",
    "listings:view",
    "payments:refund",
    "payments:view",
    "reports:view",
    "requests:reassign",
    "requests:review",
    "safe_email:resend",
  ]),
  super_admin: new Set([
    "flags:manage",
    "listings:moderate",
    "listings:remove",
    "listings:view",
    "payments:refund",
    "payments:view",
    "reports:view",
    "requests:reassign",
    "requests:review",
    "safe_email:resend",
  ]),
};

export function hasAdminPermission(
  role: AdminRole,
  permission: AdminPermission,
) {
  return permissions[role].has(permission);
}
