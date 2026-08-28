const allowedManagePath = /^\/manage(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?$/;

export function safeManageRedirect(candidate: string | null): string {
  if (!candidate) return "/manage";
  if (
    candidate.includes("\\") ||
    candidate.startsWith("//") ||
    !allowedManagePath.test(candidate)
  ) {
    return "/manage";
  }
  return candidate;
}
