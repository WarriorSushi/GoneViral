import "server-only";

import { readServerEnv } from "@/config/env/server";
import { getSqlClient } from "@/server/db/client";

export type OperationalFlag =
  "payments_enabled" | "provider_refunds_enabled" | "read_only";

export async function readOperationalFlag(
  key: OperationalFlag,
  defaultValue: boolean,
) {
  const [row] = await getSqlClient()<
    {
      value: { enabled?: unknown } | null;
    }[]
  >`
    SELECT value FROM private.operational_flags WHERE key = ${key} LIMIT 1
  `;
  return typeof row?.value?.enabled === "boolean"
    ? row.value.enabled
    : defaultValue;
}

export async function mutationsAreReadOnly() {
  return readOperationalFlag("read_only", false);
}

export async function paymentsAreEnabled() {
  const environment = readServerEnv();
  const deploymentGate =
    environment.DODO_PAYMENTS_ENVIRONMENT === "mock" ||
    environment.PAYMENTS_ENABLED === "true";
  return (
    deploymentGate && (await readOperationalFlag("payments_enabled", true))
  );
}
