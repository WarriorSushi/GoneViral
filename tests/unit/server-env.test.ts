import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { serverEnvSchema } from "@/config/env/server";

describe("server environment schema", () => {
  it("does not require database credentials before database access", () => {
    expect(serverEnvSchema.parse({})).toMatchObject({
      DODO_PAYMENTS_ENVIRONMENT: "mock",
      NODE_ENV: "development",
      PAYMENTS_ENABLED: "false",
      TURNSTILE_MODE: "mock",
    });
  });

  it("requires Dodo credentials and product configuration together in test mode", () => {
    expect(() =>
      serverEnvSchema.parse({ DODO_PAYMENTS_ENVIRONMENT: "test_mode" }),
    ).toThrow(/Dodo test mode/);
    expect(
      serverEnvSchema.parse({
        DODO_PAYMENTS_API_KEY: "test-key",
        DODO_PAYMENTS_BUSINESS_ID: "business-id",
        DODO_PAYMENTS_ENVIRONMENT: "test_mode",
        DODO_PAYMENTS_PRODUCT_ID: "product-id",
        DODO_PAYMENTS_WEBHOOK_KEY: "whsec_dGVzdA==",
      }),
    ).toMatchObject({ DODO_PAYMENTS_ENVIRONMENT: "test_mode" });
  });

  it("requires the Resend key and verified sender together in delivery mode", () => {
    expect(() =>
      serverEnvSchema.parse({ EMAIL_DELIVERY_MODE: "resend" }),
    ).toThrow(/Resend email delivery/);
    expect(
      serverEnvSchema.parse({
        EMAIL_DELIVERY_MODE: "resend",
        RESEND_API_KEY: "re_test_key",
        RESEND_FROM_EMAIL: "updates@goneviral.in",
      }),
    ).toMatchObject({ EMAIL_DELIVERY_MODE: "resend" });
    expect(
      serverEnvSchema.parse({
        RESEND_FROM_EMAIL: "",
        RESEND_REPLY_TO: "",
      }),
    ).toMatchObject({ EMAIL_DELIVERY_MODE: "mock" });
  });

  it("does not accept a live Dodo environment in Phase 4", () => {
    expect(() =>
      serverEnvSchema.parse({ DODO_PAYMENTS_ENVIRONMENT: "live_mode" }),
    ).toThrow();
  });

  it("requires runtime and direct database URLs together", () => {
    expect(() =>
      serverEnvSchema.parse({
        DATABASE_URL: "postgresql://runtime.example.internal:6543/goneviral",
      }),
    ).toThrow(/configured together/);

    expect(() =>
      serverEnvSchema.parse({
        DATABASE_DIRECT_URL:
          "postgresql://direct.example.internal:5432/goneviral",
      }),
    ).toThrow(/configured together/);
  });

  it("accepts separate PostgreSQL pooler and direct URLs", () => {
    expect(
      serverEnvSchema.parse({
        DATABASE_URL: "postgres://runtime.example.internal:6543/goneviral",
        DATABASE_DIRECT_URL:
          "postgresql://direct.example.internal:5432/goneviral",
      }),
    ).toMatchObject({
      DATABASE_URL: "postgres://runtime.example.internal:6543/goneviral",
      DATABASE_DIRECT_URL:
        "postgresql://direct.example.internal:5432/goneviral",
    });
  });

  it("rejects non-PostgreSQL database URLs", () => {
    expect(() =>
      serverEnvSchema.parse({
        DATABASE_URL: "https://runtime.example.internal/goneviral",
        DATABASE_DIRECT_URL:
          "postgresql://direct.example.internal:5432/goneviral",
      }),
    ).toThrow();
  });
});
