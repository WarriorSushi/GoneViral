const allowedManagePath = /^\/manage(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?$/;

export function buildManageCallbackUrl(siteUrl: string): string {
  return new URL("/auth/callback", new URL(siteUrl).origin).toString();
}

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
