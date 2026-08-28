import { defineConfig, devices } from "@playwright/test";

const runtimeDatabaseUrl =
  "postgresql://postgres.pooler-dev:postgres@127.0.0.1:54329/postgres";
const directDatabaseUrl =
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm exec next start --hostname 127.0.0.1 --port 3100",
    env: {
      DATABASE_DIRECT_URL: directDatabaseUrl,
      DATABASE_URL: runtimeDatabaseUrl,
      DODO_PAYMENTS_ENVIRONMENT: "mock",
      NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3100",
      PAYMENTS_ENABLED: "false",
      SUBMISSION_HMAC_SECRET: "phase4-e2e-local-only-hmac-secret",
      TURNSTILE_MODE: "mock",
    },
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "desktop-1440",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "mobile-390",
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "mobile-320",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 320, height: 568 },
      },
    },
  ],
});
