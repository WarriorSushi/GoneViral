import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { serverEnvSchema } from "@/config/env/server";

describe("server environment schema", () => {
  it("does not require database credentials before database access", () => {
    expect(serverEnvSchema.parse({})).toMatchObject({
      NODE_ENV: "development",
      PAYMENTS_ENABLED: "false",
    });
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
