import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

import { securityHeaders } from "./src/config/security-headers";

const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
  : null;

const nextConfig: NextConfig = {
  cacheComponents: true,
  async headers() {
    return [{ headers: [...securityHeaders()], source: "/:path*" }];
  },
  poweredByHeader: false,
  ...(storageUrl
    ? {
        images: {
          remotePatterns: [
            {
              hostname: storageUrl.hostname,
              pathname: "/storage/v1/object/public/goneviral-logo-public/**",
              port: storageUrl.port,
              protocol: storageUrl.protocol.replace(":", "") as
                "http" | "https",
            },
          ],
        },
      }
    : {}),
  reactStrictMode: true,
  typedRoutes: true,
};

const sentryBuildConfigured = Boolean(
  process.env.SENTRY_AUTH_TOKEN &&
  process.env.SENTRY_ORG &&
  process.env.SENTRY_PROJECT,
);

export default withSentryConfig(nextConfig, {
  ...(process.env.SENTRY_AUTH_TOKEN
    ? { authToken: process.env.SENTRY_AUTH_TOKEN }
    : {}),
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeReplayIframe: true,
    excludeReplayShadowDom: true,
  },
  ...(process.env.SENTRY_ORG ? { org: process.env.SENTRY_ORG } : {}),
  ...(process.env.SENTRY_PROJECT
    ? { project: process.env.SENTRY_PROJECT }
    : {}),
  silent: !process.env.CI,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
    disable: !sentryBuildConfigured,
  },
  telemetry: false,
  widenClientFileUpload: sentryBuildConfigured,
});
