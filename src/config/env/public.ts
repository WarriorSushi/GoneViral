import { z } from "zod";

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.url().optional(),
);

const optionalPublicKey = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

export const publicEnvSchema = z
  .object({
    NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
    NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalPublicKey,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: optionalPublicKey,
    NEXT_PUBLIC_SENTRY_DSN: optionalUrl,
  })
  .superRefine((value, context) => {
    const hasUrl = Boolean(value.NEXT_PUBLIC_SUPABASE_URL);
    const hasKey = Boolean(value.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

    if (hasUrl !== hasKey) {
      context.addIssue({
        code: "custom",
        message:
          "Supabase public URL and publishable key must be configured together.",
        path: ["NEXT_PUBLIC_SUPABASE_URL"],
      });
    }
  });

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function resolvePublicSiteUrl(
  configuredSiteUrl: string | undefined,
  vercelDeploymentHost: string | undefined,
): string | undefined {
  const configured = configuredSiteUrl?.trim();
  if (configured) return configured;

  const vercelHost = vercelDeploymentHost?.trim();
  if (!vercelHost) return undefined;

  return `https://${vercelHost}`;
}

export function readPublicEnv(): PublicEnv {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SITE_URL: resolvePublicSiteUrl(
      process.env.NEXT_PUBLIC_SITE_URL,
      process.env.NEXT_PUBLIC_VERCEL_URL,
    ),
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  });
}
