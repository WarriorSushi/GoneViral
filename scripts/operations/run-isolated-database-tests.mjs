import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import postgres from "postgres";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function parseTomlInteger(contents, section, key) {
  const sectionMatch = contents.match(
    new RegExp(`\\[${section.replace(".", "\\.")}\\]([\\s\\S]*?)(?=\\n\\[|$)`),
  );
  if (!sectionMatch) throw new Error(`Missing [${section}] in config.toml.`);
  const valueMatch = sectionMatch[1].match(
    new RegExp(`^${key}\\s*=\\s*(\\d+)`, "m"),
  );
  if (!valueMatch) throw new Error(`Missing ${section}.${key} in config.toml.`);
  return Number(valueMatch[1]);
}

function parseTomlString(contents, key) {
  const match = contents.match(new RegExp(`^${key}\\s*=\\s*"([^"]+)"`, "m"));
  if (!match) throw new Error(`Missing ${key} in config.toml.`);
  return match[1];
}

function parseStatusEnvironment(output) {
  const values = new Map();
  for (const line of output.split(/\r?\n/u)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/u);
    if (!match) continue;
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = JSON.parse(value);
    }
    values.set(match[1], value);
  }
  return values;
}

function assertLoopback(url, label, expectedPort) {
  if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) {
    throw new Error(`${label} is not loopback-only.`);
  }
  if (Number(url.port) !== expectedPort) {
    throw new Error(`${label} does not match the disposable config port.`);
  }
}

function databaseCopyFingerprint(container) {
  const dump = execFileSync(
    "docker",
    [
      "exec",
      container,
      "pg_dump",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "--data-only",
      "--quote-all-identifiers",
      "--schema=app",
      "--schema=private",
      "--schema=auth",
      "--schema=storage",
      "--schema=supabase_migrations",
    ],
    {
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    },
  ).replaceAll("\r\n", "\n");
  const copyBlocks = dump.match(/^COPY .*?^\\\.$/gms) ?? [];
  const sequenceStates =
    dump.match(/^SELECT pg_catalog\.setval\(.*?;$/gm) ?? [];
  assert.ok(copyBlocks.length > 0, "The disposable snapshot contains no data.");
  return createHash("sha256")
    .update(`${copyBlocks.join("\n")}\n${sequenceStates.join("\n")}\n`)
    .digest("hex");
}

const workdirArgument = argument("--workdir");
if (!workdirArgument) {
  throw new Error(
    "Usage: run-isolated-database-tests.mjs --workdir <disposable stack directory>",
  );
}

const rehearsalRoot = fs.realpathSync(
  path.resolve("D:\\GoneViral-Restore-Rehearsal"),
);
const workdir = fs.realpathSync(path.resolve(workdirArgument));
const relativeWorkdir = path.relative(rehearsalRoot, workdir);
if (
  !relativeWorkdir ||
  relativeWorkdir.startsWith("..") ||
  path.isAbsolute(relativeWorkdir)
) {
  throw new Error(
    "The isolated test workdir must be below the rehearsal root.",
  );
}

const configPath = path.join(workdir, "supabase", "config.toml");
const config = fs.readFileSync(configPath, "utf8");
const projectId = parseTomlString(config, "project_id");
if (!/^goneviral_phase15_restore_[a-z0-9_]+$/u.test(projectId)) {
  throw new Error("Refusing a non-rehearsal Supabase project ID.");
}

const apiPort = parseTomlInteger(config, "api", "port");
const directPort = parseTomlInteger(config, "db", "port");
const poolerPort = parseTomlInteger(config, "db.pooler", "port");
for (const port of [apiPort, directPort, poolerPort]) {
  if ([54321, 54322, 54329].includes(port)) {
    throw new Error("A disposable restore may not reuse ordinary local ports.");
  }
}

const containerNames = execFileSync(
  "docker",
  [
    "ps",
    "--filter",
    `label=com.supabase.cli.workdir=${workdir}`,
    "--format",
    "{{.Names}}",
  ],
  { encoding: "utf8" },
)
  .trim()
  .split(/\r?\n/u)
  .filter(Boolean);
const databaseContainers = containerNames.filter((name) =>
  name.startsWith("supabase_db_"),
);
assert.equal(
  databaseContainers.length,
  1,
  "Expected exactly one database container for the disposable workdir.",
);
const containerName = databaseContainers[0];
const serviceContainers = containerNames.filter(
  (name) => name !== containerName,
);
const inspection = JSON.parse(
  execFileSync("docker", ["inspect", containerName], { encoding: "utf8" }),
)[0];
assert.equal(
  inspection?.State?.Running,
  true,
  "Disposable database is not running.",
);
const databaseBindings = inspection?.NetworkSettings?.Ports?.["5432/tcp"] ?? [];
const dockerProjectId =
  inspection?.Config?.Labels?.["com.supabase.cli.project"];
if (!/^goneviral_phase15_restore_[a-z0-9_]+$/u.test(dockerProjectId ?? "")) {
  throw new Error("The Docker project label is missing or unsafe.");
}
assert.equal(
  databaseBindings.some(
    (binding) =>
      ["127.0.0.1", "0.0.0.0", "::"].includes(binding.HostIp) &&
      Number(binding.HostPort) === directPort,
  ),
  true,
  "Disposable database port does not match its Docker container.",
);

const statusOutput = execFileSync(
  "supabase",
  ["status", "--workdir", workdir, "--output", "env"],
  { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
);
const status = parseStatusEnvironment(statusOutput);
const apiUrl = new URL(status.get("API_URL"));
const directDatabaseUrl = new URL(status.get("DB_URL"));
assertLoopback(apiUrl, "Isolated API URL", apiPort);
assertLoopback(directDatabaseUrl, "Isolated direct database URL", directPort);

const runtimeDatabaseUrl = new URL(directDatabaseUrl);
runtimeDatabaseUrl.port = String(poolerPort);
runtimeDatabaseUrl.username = "postgres.pooler-dev";
const publishableKey = status.get("PUBLISHABLE_KEY") ?? status.get("ANON_KEY");
if (!publishableKey)
  throw new Error("The isolated publishable key is unavailable.");

const snapshotPath = `/tmp/goneviral-restore-test-${process.pid}.dump`;
execFileSync("docker", [
  "exec",
  containerName,
  "pg_dump",
  "-U",
  "postgres",
  "-d",
  "postgres",
  "--format=custom",
  "--schema=app",
  "--schema=private",
  "--schema=auth",
  "--schema=storage",
  "--schema=supabase_migrations",
  `--file=${snapshotPath}`,
]);
const beforeFingerprint = databaseCopyFingerprint(containerName);

const sql = postgres(directDatabaseUrl.toString(), {
  max: 1,
  prepare: false,
  types: { bigint: postgres.BigInt },
});

let testStatus = 1;
let flags;
try {
  const [identity] = await sql`
    SELECT current_database() AS database_name,
           (SELECT count(*)::int FROM auth.schema_migrations) AS auth_migrations,
           (SELECT count(*)::int FROM storage.migrations) AS storage_migrations
  `;
  assert.equal(identity.database_name, "postgres");
  assert.equal(identity.auth_migrations, 77);
  assert.equal(identity.storage_migrations, 65);

  flags = await sql`
    SELECT key, value, updated_by, updated_at::text AS updated_at
    FROM private.operational_flags
    ORDER BY key
  `;
  const paymentFlag = flags.find((row) => row.key === "payments_enabled");
  const refundFlag = flags.find(
    (row) => row.key === "provider_refunds_enabled",
  );
  assert.deepEqual(paymentFlag?.value, { enabled: false });
  assert.deepEqual(refundFlag?.value, { enabled: false });

  await sql`
    UPDATE private.operational_flags
    SET value = '{"enabled": true}'::jsonb
    WHERE key = 'payments_enabled'
  `;

  const childEnvironment = { ...process.env };
  for (const name of [
    "DODO_PAYMENTS_API_KEY",
    "DODO_PAYMENTS_BUSINESS_ID",
    "DODO_PAYMENTS_PRODUCT_ID",
    "DODO_PAYMENTS_WEBHOOK_KEY",
    "RESEND_API_KEY",
    "SUPABASE_SECRET_KEY",
    "TURNSTILE_SECRET_KEY",
  ]) {
    delete childEnvironment[name];
  }
  Object.assign(childEnvironment, {
    DATABASE_DIRECT_URL: directDatabaseUrl.toString(),
    DATABASE_URL: runtimeDatabaseUrl.toString(),
    DODO_PAYMENTS_ENVIRONMENT: "mock",
    EMAIL_DELIVERY_MODE: "mock",
    GONEVIRAL_ALLOW_DISPOSABLE_DATABASE_TEST_TARGET: "true",
    GONEVIRAL_DISPOSABLE_RESTORE_TEST: "true",
    GONEVIRAL_RESTORE_PROJECT_ID: dockerProjectId,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    NEXT_PUBLIC_SUPABASE_URL: apiUrl.toString().replace(/\/$/u, ""),
    NODE_ENV: "test",
    PAYMENTS_ENABLED: "true",
    TURNSTILE_MODE: "mock",
  });

  process.stdout.write(
    `Running 66 database tests against isolated project ${projectId}.\n`,
  );
  const result = spawnSync(
    process.execPath,
    [
      path.resolve("node_modules/vitest/vitest.mjs"),
      "run",
      "--config",
      "vitest.database.config.ts",
    ],
    { cwd: process.cwd(), env: childEnvironment, stdio: "inherit" },
  );
  testStatus = result.status ?? 1;
} finally {
  await sql.end({ timeout: 5 });
  let restoreFailure;
  try {
    if (serviceContainers.length > 0) {
      execFileSync("docker", ["stop", ...serviceContainers], {
        stdio: "ignore",
      });
    }
    execFileSync("docker", [
      "exec",
      containerName,
      "pg_restore",
      "-U",
      "supabase_admin",
      "-d",
      "postgres",
      "--clean",
      "--if-exists",
      "--single-transaction",
      "--exit-on-error",
      snapshotPath,
    ]);
  } catch (error) {
    restoreFailure = error;
  } finally {
    try {
      execFileSync("docker", ["exec", containerName, "rm", "-f", snapshotPath]);
    } finally {
      if (serviceContainers.length > 0) {
        execFileSync("docker", ["start", ...serviceContainers], {
          stdio: "ignore",
        });
      }
    }
  }
  if (restoreFailure) throw restoreFailure;

  const afterFingerprint = databaseCopyFingerprint(containerName);
  assert.equal(
    afterFingerprint,
    beforeFingerprint,
    "The complete restored database payload was not recovered after tests.",
  );

  const verificationSql = postgres(directDatabaseUrl.toString(), {
    max: 1,
    prepare: false,
    types: { bigint: postgres.BigInt },
  });
  try {
    if (flags) {
      const restored = await verificationSql`
      SELECT key, value, updated_by, updated_at::text AS updated_at
      FROM private.operational_flags
      ORDER BY key
      `;
      assert.deepEqual(
        restored,
        flags,
        "Operational flags were not restored exactly.",
      );
      const disabled = restored.filter(
        (row) =>
          ["payments_enabled", "provider_refunds_enabled"].includes(row.key) &&
          row.value?.enabled === false,
      );
      assert.equal(
        disabled.length,
        2,
        "Payment/refund shutdown was not restored.",
      );
    }
    const [histories] = await verificationSql`
      SELECT (SELECT count(*)::int FROM auth.schema_migrations) AS auth,
             (SELECT count(*)::int FROM storage.migrations) AS storage
    `;
    assert.deepEqual(histories, { auth: 77, storage: 65 });
    process.stdout.write(
      "Complete restored payload and exact disabled operational flags recovered.\n",
    );
  } finally {
    await verificationSql.end({ timeout: 5 });
  }
}

process.exitCode = testStatus;
