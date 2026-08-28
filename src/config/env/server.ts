import "server-only";
import { z } from "zod";

const optionalSecret = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const optionalDatabaseUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.url({ protocol: /^postgres(?:ql)?$/ }).optional(),
);

export const serverEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: optionalDatabaseUrl,
    DATABASE_DIRECT_URL: optionalDatabaseUrl,
    SUPABASE_SECRET_KEY: optionalSecret,
    DODO_PAYMENTS_API_KEY: optionalSecret,
    DODO_PAYMENTS_PRODUCT_ID: optionalSecret,
    DODO_PAYMENTS_ENVIRONMENT: z.enum(["mock", "test_mode"]).default("mock"),
    RESEND_API_KEY: optionalSecret,
    TURNSTILE_SECRET_KEY: optionalSecret,
    TURNSTILE_MODE: z.enum(["mock", "cloudflare"]).default("mock"),
    SUBMISSION_HMAC_SECRET: optionalSecret,
    CLICK_HMAC_SECRET_CURRENT: optionalSecret,
    CLICK_HMAC_SECRET_PREVIOUS: optionalSecret,
    SENTRY_AUTH_TOKEN: optionalSecret,
    CRON_SECRET: optionalSecret,
    PAYMENTS_ENABLED: z.enum(["true", "false"]).default("false"),
  })
  .superRefine((environment, context) => {
    if (
      Boolean(environment.DATABASE_URL) !==
      Boolean(environment.DATABASE_DIRECT_URL)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "DATABASE_URL and DATABASE_DIRECT_URL must be configured together.",
        path: environment.DATABASE_URL
          ? ["DATABASE_DIRECT_URL"]
          : ["DATABASE_URL"],
      });
    }

    if (
      environment.DODO_PAYMENTS_ENVIRONMENT === "test_mode" &&
      (!environment.DODO_PAYMENTS_API_KEY ||
        !environment.DODO_PAYMENTS_PRODUCT_ID)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Dodo test mode requires DODO_PAYMENTS_API_KEY and DODO_PAYMENTS_PRODUCT_ID.",
        path: ["DODO_PAYMENTS_API_KEY"],
      });
    }

    if (
      environment.TURNSTILE_MODE === "cloudflare" &&
      !environment.TURNSTILE_SECRET_KEY
    ) {
      context.addIssue({
        code: "custom",
        message: "Cloudflare Turnstile mode requires TURNSTILE_SECRET_KEY.",
        path: ["TURNSTILE_SECRET_KEY"],
      });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function readServerEnv(): ServerEnv {
  return serverEnvSchema.parse(process.env);
}
