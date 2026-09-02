const ordinaryLocalPorts = {
  api: "54321",
  directDatabase: "54322",
  runtimeDatabase: "54329",
};

function assertLoopbackUrl(
  value: string,
  label: string,
  protocols: readonly string[],
) {
  const parsed = new URL(value);
  if (!protocols.includes(parsed.protocol)) {
    throw new Error(`${label} uses an unsupported protocol.`);
  }
  if (!["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname)) {
    throw new Error(`${label} must target the local machine.`);
  }
  if (!parsed.port) throw new Error(`${label} must use an explicit port.`);
  return parsed;
}

const apiUrl = assertLoopbackUrl(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
  "NEXT_PUBLIC_SUPABASE_URL",
  ["http:", "https:"],
);
const directDatabaseUrl = assertLoopbackUrl(
  process.env.DATABASE_DIRECT_URL ??
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  "DATABASE_DIRECT_URL",
  ["postgres:", "postgresql:"],
);
const runtimeDatabaseUrl = assertLoopbackUrl(
  process.env.DATABASE_URL ??
    "postgresql://postgres.pooler-dev:postgres@127.0.0.1:54329/postgres",
  "DATABASE_URL",
  ["postgres:", "postgresql:"],
);

if (process.env.GONEVIRAL_DISPOSABLE_RESTORE_TEST === "true") {
  const projectId = process.env.GONEVIRAL_RESTORE_PROJECT_ID ?? "";
  if (!/^goneviral_phase15_restore_[a-z0-9_]+$/.test(projectId)) {
    throw new Error("The disposable restore project ID is missing or unsafe.");
  }
  for (const [label, value] of [
    ["API", apiUrl.port],
    ["direct database", directDatabaseUrl.port],
    ["runtime database", runtimeDatabaseUrl.port],
  ] as const) {
    if (Object.values(ordinaryLocalPorts).includes(value)) {
      throw new Error(
        `The disposable restore ${label} may not use an ordinary local port.`,
      );
    }
  }
  if (process.env.DODO_PAYMENTS_ENVIRONMENT !== "mock") {
    throw new Error("Disposable restore tests require the mock Dodo provider.");
  }
  if (process.env.PAYMENTS_ENABLED !== "true") {
    throw new Error(
      "Disposable restore tests require the wrapper's temporary payment prerequisite.",
    );
  }
  for (const name of [
    "DODO_PAYMENTS_API_KEY",
    "DODO_PAYMENTS_BUSINESS_ID",
    "DODO_PAYMENTS_PRODUCT_ID",
    "DODO_PAYMENTS_WEBHOOK_KEY",
  ]) {
    if (process.env[name]) {
      throw new Error(`Disposable restore tests forbid ${name}.`);
    }
  }
}
