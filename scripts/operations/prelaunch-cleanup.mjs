import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createReadStream } from "node:fs";
import { readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { createInterface } from "node:readline/promises";

import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const archiveArgumentIndex = process.argv.indexOf("--backup-archive");
const archiveInput =
  archiveArgumentIndex >= 0 ? process.argv[archiveArgumentIndex + 1] : null;
if (!archiveInput) {
  throw new Error(
    "Usage: pnpm ops:prelaunch-cleanup -- --backup-archive D:\\GoneViral-Backups\\<timestamp>-<ref>.7z",
  );
}

const requiredEnvironment = {
  databaseUrl: process.env.DATABASE_DIRECT_URL,
  dodoEnvironment: process.env.DODO_PAYMENTS_ENVIRONMENT,
  paymentsEnabled: process.env.PAYMENTS_ENABLED,
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
};
for (const [name, value] of Object.entries(requiredEnvironment)) {
  if (!value)
    throw new Error(`Required cleanup environment is missing: ${name}`);
}
if (requiredEnvironment.dodoEnvironment !== "test_mode") {
  throw new Error(
    "Cleanup is restricted to DODO_PAYMENTS_ENVIRONMENT=test_mode.",
  );
}
if (requiredEnvironment.paymentsEnabled !== "false") {
  throw new Error("Cleanup requires PAYMENTS_ENABLED=false.");
}

const linkedRef = (
  await readFile(resolve("supabase/.temp/project-ref"), "utf8")
).trim();
if (!/^[a-z]{20}$/.test(linkedRef)) {
  throw new Error("The linked Supabase project ref is missing or malformed.");
}
const supabaseUrl = new URL(requiredEnvironment.supabaseUrl);
if (
  supabaseUrl.protocol !== "https:" ||
  supabaseUrl.hostname !== `${linkedRef}.supabase.co`
) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL does not match the linked project ref.",
  );
}
const databaseUrl = new URL(requiredEnvironment.databaseUrl);
if (
  databaseUrl.protocol !== "postgresql:" &&
  databaseUrl.protocol !== "postgres:"
) {
  throw new Error("DATABASE_DIRECT_URL must be PostgreSQL.");
}
if (!decodeURIComponent(requiredEnvironment.databaseUrl).includes(linkedRef)) {
  throw new Error(
    "DATABASE_DIRECT_URL does not identify the linked project ref.",
  );
}

const archivePath = resolve(archiveInput);
if (!basename(archivePath).endsWith(`-${linkedRef}.7z`)) {
  throw new Error(
    "Backup archive filename does not match the linked project ref.",
  );
}
const archiveStat = await stat(archivePath);
const backupAgeMs = Date.now() - archiveStat.mtimeMs;
if (backupAgeMs < 0 || backupAgeMs > 24 * 60 * 60 * 1_000) {
  throw new Error(
    "Cleanup requires a verified backup created within the last 24 hours.",
  );
}
const actualHash = await new Promise((resolveHash, rejectHash) => {
  const hash = createHash("sha256");
  const stream = createReadStream(archivePath);
  stream.on("data", (chunk) => hash.update(chunk));
  stream.on("error", rejectHash);
  stream.on("end", () => resolveHash(hash.digest("hex")));
});
const hashEvidence = await readFile(`${archivePath}.sha256`, "ascii");
if (!hashEvidence.toLowerCase().startsWith(`${actualHash}  `)) {
  throw new Error("Backup SHA-256 evidence does not match the archive.");
}
console.info(
  "Re-enter the backup passphrase so 7-Zip can verify the archive before cleanup.",
);
const archiveTest = spawnSync("7z", ["t", archivePath], {
  stdio: "inherit",
});
if (archiveTest.status !== 0) {
  throw new Error("The encrypted backup archive did not pass verification.");
}

const sql = postgres(requiredEnvironment.databaseUrl, {
  max: 1,
  prepare: false,
  types: { bigint: postgres.BigInt },
});
const supabase = createClient(
  requiredEnvironment.supabaseUrl,
  requiredEnvironment.supabaseSecretKey,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const buckets = ["goneviral-logo-staging", "goneviral-logo-public"];

async function countAuthUsers() {
  let count = 0;
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    count += data.users.length;
    if (data.users.length < 1000) return count;
  }
}

async function listStorageObjects(bucket, prefix = "") {
  const paths = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: 1000,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id) paths.push(path);
      else paths.push(...(await listStorageObjects(bucket, path)));
    }
    if (data.length < 1000) return paths;
  }
}

async function readDatabaseCounts() {
  const rows = await sql`
    SELECT schemaname, relname,
           (xpath('/row/c/text()', query_to_xml(
             format('SELECT count(*) AS c FROM %I.%I', schemaname, relname),
             false, true, ''
           )))[1]::text::bigint AS row_count
    FROM pg_stat_user_tables
    WHERE schemaname IN ('app', 'private')
    ORDER BY schemaname, relname
  `;
  return Object.fromEntries(
    rows.map((row) => [
      `${row.schemaname}.${row.relname}`,
      String(row.row_count),
    ]),
  );
}

try {
  const [unexpectedFinancial] = await sql`
    SELECT
      count(*) FILTER (WHERE entry_type = 'admin_financial_correction')::bigint AS admin_corrections,
      count(*) FILTER (WHERE currency <> 'INR')::bigint AS wrong_currency,
      count(*) FILTER (WHERE source_provider IS NOT NULL AND source_provider <> 'dodo')::bigint AS unknown_provider,
      count(*) FILTER (WHERE source_environment IS NOT NULL AND source_environment NOT IN ('mock', 'test_mode'))::bigint AS unsafe_environment
    FROM private.financial_ledger
  `;
  const [unexpectedProviderRecords] = await sql`
    SELECT
      (SELECT count(*) FROM private.payment_attempts WHERE provider <> 'dodo' OR provider_environment NOT IN ('mock', 'test_mode'))::bigint AS attempts,
      (SELECT count(*) FROM private.provider_events WHERE provider <> 'dodo' OR provider_environment NOT IN ('mock', 'test_mode'))::bigint AS events,
      (SELECT count(*) FROM private.provider_payments WHERE provider <> 'dodo' OR provider_environment NOT IN ('mock', 'test_mode'))::bigint AS payments,
      (SELECT count(*) FROM private.provider_adjustments WHERE provider <> 'dodo' OR provider_environment NOT IN ('mock', 'test_mode'))::bigint AS adjustments
  `;
  if (
    Object.values({
      ...unexpectedFinancial,
      ...unexpectedProviderRecords,
    }).some((value) => BigInt(value) !== 0n)
  ) {
    throw new Error(
      "Cleanup aborted: live, unknown, non-INR, or admin-corrected financial records exist.",
    );
  }

  const databaseCounts = await readDatabaseCounts();
  const authUserCount = await countAuthUsers();
  const storageObjects = Object.fromEntries(
    await Promise.all(
      buckets.map(async (bucket) => [bucket, await listStorageObjects(bucket)]),
    ),
  );
  console.info(
    JSON.stringify({
      authUserCount,
      databaseCounts,
      projectRef: linkedRef,
      storageObjectCounts: Object.fromEntries(
        Object.entries(storageObjects).map(([bucket, paths]) => [
          bucket,
          paths.length,
        ]),
      ),
    }),
  );

  const confirmationPhrase = `DELETE GONEVIRAL PRELAUNCH TEST DATA ${linkedRef}`;
  const prompt = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const confirmation = await prompt.question(
    `Type exactly: ${confirmationPhrase}\n> `,
  );
  prompt.close();
  if (confirmation !== confirmationPhrase) {
    throw new Error("Cleanup confirmation did not match. No data was changed.");
  }

  for (const [bucket, paths] of Object.entries(storageObjects)) {
    for (let index = 0; index < paths.length; index += 100) {
      const { error } = await supabase.storage
        .from(bucket)
        .remove(paths.slice(index, index + 100));
      if (error) throw error;
    }
  }

  const dataTables = await sql`
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname IN ('app', 'private')
      AND NOT (schemaname = 'app' AND tablename = 'categories')
      AND NOT (schemaname = 'private' AND tablename = 'operational_flags')
    ORDER BY schemaname, tablename
  `;
  for (const row of dataTables) {
    if (!/^[a-z_]+$/.test(row.schemaname) || !/^[a-z_]+$/.test(row.tablename)) {
      throw new Error("Unexpected database identifier during cleanup.");
    }
  }
  if (dataTables.length) {
    const identifiers = dataTables
      .map((row) => `"${row.schemaname}"."${row.tablename}"`)
      .join(", ");
    await sql.unsafe(`TRUNCATE TABLE ${identifiers} RESTART IDENTITY CASCADE`);
  }
  await sql`
    UPDATE private.operational_flags
    SET value = jsonb_set(value, '{enabled}', 'false'::jsonb, true),
        updated_by = NULL,
        updated_at = now()
    WHERE key IN ('outbound_redirects_enabled', 'payments_enabled', 'provider_refunds_enabled')
  `;
  await sql`
    UPDATE private.operational_flags
    SET value = jsonb_set(value, '{enabled}', 'false'::jsonb, true),
        updated_by = NULL,
        updated_at = now()
    WHERE key = 'read_only'
  `;

  for (let page = 1; ;) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    if (!data.users.length) break;
    for (const user of data.users) {
      const { error: deletionError } = await supabase.auth.admin.deleteUser(
        user.id,
        false,
      );
      if (deletionError) throw deletionError;
    }
  }

  const [categoryCheck] = await sql`
    SELECT count(*)::bigint AS count,
           count(*) FILTER (WHERE is_active)::bigint AS active_count
    FROM app.categories
  `;
  const remainingDatabaseCounts = await readDatabaseCounts();
  const remainingAuthUsers = await countAuthUsers();
  const remainingStorage = Object.fromEntries(
    await Promise.all(
      buckets.map(async (bucket) => [
        bucket,
        (await listStorageObjects(bucket)).length,
      ]),
    ),
  );
  const nonConfigurationRows = Object.entries(remainingDatabaseCounts).filter(
    ([table, count]) =>
      !["app.categories", "private.operational_flags"].includes(table) &&
      BigInt(count) !== 0n,
  );
  if (
    BigInt(categoryCheck.count) !== 6n ||
    BigInt(categoryCheck.active_count) !== 6n ||
    remainingAuthUsers !== 0 ||
    Object.values(remainingStorage).some((count) => count !== 0) ||
    nonConfigurationRows.length
  ) {
    throw new Error(
      "Post-cleanup verification failed. Restore from the verified backup before continuing.",
    );
  }

  const report = {
    backupArchiveSha256: actualHash,
    completedAtUtc: new Date().toISOString(),
    projectRef: linkedRef,
    result: "prelaunch_test_data_cleanup_verified",
    retainedCategoryCount: "6",
  };
  const reportPath = resolve(
    dirname(archivePath),
    `${basename(archivePath, ".7z")}-cleanup-report.json`,
  );
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  console.info(JSON.stringify({ ...report, reportPath }));
} finally {
  await sql.end({ timeout: 5 });
}
