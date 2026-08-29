function safeOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function directive(name: string, values: readonly string[]): string {
  return `${name} ${[...new Set(values)].join(" ")}`;
}

export function buildContentSecurityPolicy(input: {
  nodeEnvironment: string | undefined;
  sentryDsn: string | undefined;
  supabaseUrl: string | undefined;
}): string {
  const development = input.nodeEnvironment === "development";
  const supabaseOrigin = safeOrigin(input.supabaseUrl);
  const sentryOrigin = safeOrigin(input.sentryDsn);
  const cloudflare = "https://challenges.cloudflare.com";
  const policies = [
    directive("default-src", ["'self'"]),
    directive("script-src", [
      "'self'",
      "'unsafe-inline'",
      ...(development ? ["'unsafe-eval'"] : []),
      cloudflare,
    ]),
    directive("style-src", ["'self'", "'unsafe-inline'"]),
    directive("img-src", [
      "'self'",
      "data:",
      "blob:",
      ...(supabaseOrigin ? [supabaseOrigin] : []),
    ]),
    directive("font-src", ["'self'", "data:"]),
    directive("connect-src", [
      "'self'",
      cloudflare,
      ...(supabaseOrigin ? [supabaseOrigin] : []),
      ...(sentryOrigin ? [sentryOrigin] : []),
    ]),
    directive("frame-src", [cloudflare]),
    directive("worker-src", ["'self'", "blob:"]),
    directive("object-src", ["'none'"]),
    directive("base-uri", ["'self'"]),
    directive("form-action", ["'self'"]),
    directive("frame-ancestors", ["'none'"]),
    ...(input.nodeEnvironment === "production"
      ? ["upgrade-insecure-requests"]
      : []),
  ];
  return policies.join("; ");
}

export function securityHeaders() {
  return [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy({
        nodeEnvironment: process.env.NODE_ENV,
        sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      }),
    },
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value:
        "camera=(), geolocation=(), microphone=(), payment=(), usb=(), browsing-topics=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
    { key: "Cross-Origin-Resource-Policy", value: "same-site" },
    { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  ] as const;
}
