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

const optionalEmail = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.email().optional(),
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
    DODO_PAYMENTS_BUSINESS_ID: optionalSecret,
    DODO_PAYMENTS_PRODUCT_ID: optionalSecret,
    DODO_PAYMENTS_WEBHOOK_KEY: optionalSecret,
    DODO_PAYMENTS_ENVIRONMENT: z
      .enum(["mock", "test_mode", "live_mode"])
      .default("mock"),
    RESEND_API_KEY: optionalSecret,
    RESEND_FROM_EMAIL: optionalEmail,
    RESEND_REPLY_TO: optionalEmail,
    RESEND_WEBHOOK_SECRET: optionalSecret,
    EMAIL_DELIVERY_MODE: z.enum(["mock", "resend"]).default("mock"),
    TURNSTILE_SECRET_KEY: optionalSecret,
    TURNSTILE_MODE: z.enum(["mock", "cloudflare"]).default("mock"),
    SUBMISSION_HMAC_SECRET: optionalSecret,
    CLICK_HMAC_SECRET_CURRENT: optionalSecret,
    CLICK_HMAC_SECRET_PREVIOUS: optionalSecret,
    SENTRY_AUTH_TOKEN: optionalSecret,
    SENTRY_ORG: optionalSecret,
    SENTRY_PROJECT: optionalSecret,
    CRON_SECRET: optionalSecret,
    PAYMENTS_ENABLED: z.enum(["true", "false"]).default("false"),
    PRIVATE_DATA_ENCRYPTION_KEY: optionalSecret,
    PRIVATE_DATA_ENCRYPTION_KEY_PREVIOUS: optionalSecret,
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
      environment.DODO_PAYMENTS_ENVIRONMENT !== "mock" &&
      (!environment.DODO_PAYMENTS_API_KEY ||
        !environment.DODO_PAYMENTS_BUSINESS_ID ||
        !environment.DODO_PAYMENTS_PRODUCT_ID ||
        !environment.DODO_PAYMENTS_WEBHOOK_KEY)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Dodo provider mode requires API, business, product, and webhook credentials.",
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

    if (
      environment.EMAIL_DELIVERY_MODE === "resend" &&
      (!environment.RESEND_API_KEY || !environment.RESEND_FROM_EMAIL)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Resend email delivery requires RESEND_API_KEY and RESEND_FROM_EMAIL.",
        path: ["RESEND_API_KEY"],
      });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function readServerEnv(): ServerEnv {
  return serverEnvSchema.parse(process.env);
}
