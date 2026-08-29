import assert from "node:assert/strict";

import postgres from "postgres";

const databaseUrl =
  process.env.DATABASE_DIRECT_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const parsed = new URL(databaseUrl);
if (
  !["127.0.0.1", "localhost"].includes(parsed.hostname) ||
  parsed.port !== "54322"
) {
  throw new Error(
    "The critical restore rehearsal is restricted to local Supabase port 54322.",
  );
}

const tables = [
  ["app.listings", "id"],
  ["app.listing_daily_totals", "listing_id, business_date"],
  ["private.payment_attempts", "id"],
  ["private.provider_events", "id"],
  ["private.provider_payments", "id"],
  ["private.provider_adjustments", "id"],
  ["private.financial_ledger", "id"],
  ["private.admin_audit_events", "id"],
  ["private.email_outbox", "id"],
  ["private.email_provider_events", "event_id"],
];

const sql = postgres(databaseUrl, {
  max: 1,
  prepare: false,
  types: { bigint: postgres.BigInt },
});

async function fingerprint(transaction, table, orderBy) {
  const [row] = await transaction.unsafe(`
    SELECT count(*)::bigint AS row_count,
           md5(COALESCE(string_agg(to_jsonb(source)::text, E'\\n'
               ORDER BY ${orderBy}), '')) AS fingerprint
    FROM ${table} AS source
  `);
  return {
    fingerprint: String(row.fingerprint),
    rowCount: BigInt(row.row_count),
  };
}

try {
  const evidence = await sql.begin(async (transaction) => {
    await transaction`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ`;
    const summary = [];
    for (const [index, [sourceTable, orderBy]] of tables.entries()) {
      const restoredTable = `phase13_restore_${index}`;
      const source = await fingerprint(transaction, sourceTable, orderBy);
      await transaction.unsafe(
        `CREATE TEMP TABLE ${restoredTable} ON COMMIT DROP AS TABLE ${sourceTable}`,
      );
      const restored = await fingerprint(transaction, restoredTable, orderBy);
      assert.deepEqual(restored, source, `${sourceTable} restore mismatch`);
      summary.push({
        fingerprint: source.fingerprint,
        rowCount: source.rowCount.toString(),
        table: sourceTable,
      });
    }
    return summary;
  });
  console.info(
    JSON.stringify({
      result: "critical_restore_rehearsal_passed",
      tables: evidence,
    }),
  );
} finally {
  await sql.end({ timeout: 5 });
}
