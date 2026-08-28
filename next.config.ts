import type { NextConfig } from "next";

const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
  : null;

const nextConfig: NextConfig = {
  cacheComponents: true,
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

export default nextConfig;
