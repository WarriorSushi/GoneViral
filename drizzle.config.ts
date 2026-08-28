import { defineConfig } from "drizzle-kit";

const directDatabaseUrl = process.env.DATABASE_DIRECT_URL;

if (!directDatabaseUrl) {
  throw new Error(
    "DATABASE_DIRECT_URL is required for Drizzle migration generation and inspection.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: directDatabaseUrl,
  },
  schemaFilter: ["app", "private"],
  strict: true,
  verbose: true,
});
