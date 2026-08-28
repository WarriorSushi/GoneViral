import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import path from "node:path";

import postgres from "postgres";

const migrationsDirectory = path.resolve("supabase", "migrations");
const migrationPattern = /^(\d{14})_([a-z0-9_]+)\.sql$/;
const migrationFiles = (await readdir(migrationsDirectory))
  .filter((file) => file.endsWith(".sql"))
  .sort();

assert.ok(migrationFiles.length > 0, "At least one migration must exist.");

const expectedVersions = migrationFiles.map((file) => {
  const match = migrationPattern.exec(file);
  assert.ok(match, `Invalid Supabase migration filename: ${file}`);
  return match[1];
});

assert.equal(
  new Set(expectedVersions).size,
  expectedVersions.length,
  "Migration versions must be unique.",
);

const databaseUrl =
  process.env.DATABASE_DIRECT_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const sql = postgres(databaseUrl, { max: 1, prepare: false });

try {
  const applied = await sql`
    select version
    from supabase_migrations.schema_migrations
    order by version
  `;
  const appliedVersions = applied.map((row) => row.version);

  assert.deepEqual(
    appliedVersions,
    expectedVersions,
    "Applied migration history must exactly match committed migration files.",
  );

  console.log(
    `Migration verification passed: ${migrationFiles.length} committed migration(s) applied in order.`,
  );
} finally {
  await sql.end({ timeout: 5 });
}
