import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { readServerEnv } from "@/config/env/server";

import { databaseSchema } from "./schema";

function createRuntimeSql(databaseUrl: string) {
  return postgres(databaseUrl, {
    prepare: false,
    max: 4,
    connect_timeout: 10,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    types: {
      bigint: postgres.BigInt,
    },
  });
}

type RuntimeSql = ReturnType<typeof createRuntimeSql>;
type Database = PostgresJsDatabase<typeof databaseSchema>;

type DatabaseGlobals = typeof globalThis & {
  __goneviralDatabase?: Database;
  __goneviralSql?: RuntimeSql;
};

const databaseGlobals = globalThis as DatabaseGlobals;

let moduleDatabase: Database | undefined;
let moduleSql: RuntimeSql | undefined;

function requireRuntimeDatabaseUrl(): string {
  const { DATABASE_URL: databaseUrl } = readServerEnv();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required before database access.");
  }

  return databaseUrl;
}

export function getSqlClient(): RuntimeSql {
  if (process.env.NODE_ENV === "development") {
    databaseGlobals.__goneviralSql ??= createRuntimeSql(
      requireRuntimeDatabaseUrl(),
    );
    return databaseGlobals.__goneviralSql;
  }

  moduleSql ??= createRuntimeSql(requireRuntimeDatabaseUrl());
  return moduleSql;
}

export function getDatabase(): Database {
  if (process.env.NODE_ENV === "development") {
    databaseGlobals.__goneviralDatabase ??= drizzle(getSqlClient(), {
      schema: databaseSchema,
    });
    return databaseGlobals.__goneviralDatabase;
  }

  moduleDatabase ??= drizzle(getSqlClient(), { schema: databaseSchema });
  return moduleDatabase;
}

export async function closeDatabase(): Promise<void> {
  const sqlClient =
    process.env.NODE_ENV === "development"
      ? databaseGlobals.__goneviralSql
      : moduleSql;

  if (sqlClient) {
    await sqlClient.end({ timeout: 5 });
  }

  moduleDatabase = undefined;
  moduleSql = undefined;
  delete databaseGlobals.__goneviralDatabase;
  delete databaseGlobals.__goneviralSql;
}
