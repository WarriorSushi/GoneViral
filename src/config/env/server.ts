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
    CASHFREE_CLIENT_ID: optionalSecret,
    CASHFREE_CLIENT_SECRET: optionalSecret,
    CASHFREE_WEBHOOK_SECRET: optionalSecret,
    RESEND_API_KEY: optionalSecret,
    TURNSTILE_SECRET_KEY: optionalSecret,
    CLICK_HMAC_SECRET_CURRENT: optionalSecret,
    CLICK_HMAC_SECRET_PREVIOUS: optionalSecret,
    SENTRY_AUTH_TOKEN: optionalSecret,
    CRON_SECRET: optionalSecret,
    PAYMENTS_ENABLED: z.enum(["true", "false"]).default("false"),
  })
  .superRefine((environment, context) => {
    if (
      Boolean(environment.DATABASE_URL) ===
      Boolean(environment.DATABASE_DIRECT_URL)
    ) {
      return;
    }

    context.addIssue({
      code: "custom",
      message:
        "DATABASE_URL and DATABASE_DIRECT_URL must be configured together.",
      path: environment.DATABASE_URL
        ? ["DATABASE_DIRECT_URL"]
        : ["DATABASE_URL"],
    });
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function readServerEnv(): ServerEnv {
  return serverEnvSchema.parse(process.env);
}
