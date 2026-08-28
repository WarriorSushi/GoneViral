import { randomUUID } from "node:crypto";

import postgres from "postgres";

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

const listingId = readArgument("--listing");
const reason = readArgument("--reason");
const apply = process.argv.includes("--apply");
const databaseUrl = process.env.DATABASE_DIRECT_URL;

if (!databaseUrl) throw new Error("DATABASE_DIRECT_URL is required.");
if (!listingId || !/^[0-9a-f-]{36}$/i.test(listingId))
  throw new Error("Provide a listing UUID with --listing.");
if (!reason || reason.trim().length < 8)
  throw new Error(
    "Provide an operational reason (8+ characters) with --reason.",
  );

const sql = postgres(databaseUrl, {
  max: 1,
  prepare: false,
  types: { bigint: postgres.BigInt },
});

try {
  const report = await sql.begin(async (transaction) => {
    const [lockedListing] = await transaction`
      SELECT id, public_id, confirmed_total_paise, original_sponsorship_paise,
             current_total_reached_at, lifecycle_status
      FROM app.listings WHERE id = ${listingId} FOR UPDATE
    `;
    if (!lockedListing) throw new Error("Listing was not found.");
    const [projection] = await transaction`
      SELECT sum(ledger.amount_delta_paise)::bigint AS expected_total,
             (array_agg(ledger.amount_delta_paise ORDER BY ledger.applied_at, ledger.id)
                FILTER (WHERE ledger.entry_type = 'initial_sponsorship'))[1]
               AS expected_original,
             max(ledger.applied_at) AS expected_reached_at,
             min(ledger.applied_at) FILTER (WHERE ledger.amount_delta_paise > 0)
               AS expected_first_confirmed_at
      FROM private.financial_ledger AS ledger
      WHERE ledger.listing_id = ${listingId}
    `;
    if (!projection?.expected_reached_at)
      throw new Error("Listing has no financial ledger projection to repair.");

    const expectedLifecycle =
      lockedListing.lifecycle_status === "removed"
        ? "removed"
        : projection.expected_total === 0n
          ? "inactive_reversed"
          : "active";
    const actualDaily = await transaction`
      SELECT business_date, net_amount_paise, total_reached_at,
             last_ledger_entry_id
      FROM app.listing_daily_totals WHERE listing_id = ${listingId}
      ORDER BY business_date
    `;
    const expectedDaily = await transaction`
      SELECT aggregate.business_date, aggregate.net_amount_paise,
             latest.applied_at AS total_reached_at,
             latest.id AS last_ledger_entry_id
      FROM (
        SELECT applied_business_date AS business_date,
               sum(amount_delta_paise)::bigint AS net_amount_paise
        FROM private.financial_ledger WHERE listing_id = ${listingId}
        GROUP BY applied_business_date
      ) AS aggregate
      JOIN LATERAL (
        SELECT id, applied_at FROM private.financial_ledger
        WHERE listing_id = ${listingId}
          AND applied_business_date = aggregate.business_date
        ORDER BY applied_at DESC, id DESC LIMIT 1
      ) AS latest ON true
      ORDER BY aggregate.business_date
    `;
    const runId = randomUUID();
    const now = new Date().toISOString();
    const expected = {
      confirmedTotalPaise: projection.expected_total.toString(),
      currentTotalReachedAt: new Date(
        projection.expected_reached_at,
      ).toISOString(),
      dailyTotals: expectedDaily.map((row) => ({
        businessDate: row.business_date,
        lastLedgerEntryId: row.last_ledger_entry_id,
        netAmountPaise: row.net_amount_paise.toString(),
        totalReachedAt: new Date(row.total_reached_at).toISOString(),
      })),
      lifecycleStatus: expectedLifecycle,
      originalSponsorshipPaise:
        projection.expected_original?.toString() ?? null,
    };
    const actual = {
      confirmedTotalPaise: lockedListing.confirmed_total_paise.toString(),
      currentTotalReachedAt: lockedListing.current_total_reached_at
        ? new Date(lockedListing.current_total_reached_at).toISOString()
        : null,
      dailyTotals: actualDaily.map((row) => ({
        businessDate: row.business_date,
        lastLedgerEntryId: row.last_ledger_entry_id,
        netAmountPaise: row.net_amount_paise.toString(),
        totalReachedAt: new Date(row.total_reached_at).toISOString(),
      })),
      lifecycleStatus: lockedListing.lifecycle_status,
      originalSponsorshipPaise:
        lockedListing.original_sponsorship_paise?.toString() ?? null,
    };

    await transaction`
      INSERT INTO private.reconciliation_runs (
        id, provider, environment, kind, window_start, window_end, state,
        completed_at, counts, error_summary
      ) VALUES (
        ${runId}, 'ledger', 'local', 'manual_projection_repair', ${now}, ${now},
        'completed', ${now},
        ${JSON.stringify({ applied: apply ? "1" : "0", inspected: "1" })}::jsonb,
        ${reason.trim().slice(0, 500)}
      )
    `;

    if (apply) {
      await transaction`
        UPDATE app.listings
        SET confirmed_total_paise = ${projection.expected_total},
            original_sponsorship_paise = ${projection.expected_original},
            current_total_reached_at = ${new Date(projection.expected_reached_at).toISOString()},
            first_confirmed_at = ${projection.expected_first_confirmed_at ? new Date(projection.expected_first_confirmed_at).toISOString() : null},
            last_rank_change_at = ${new Date(projection.expected_reached_at).toISOString()},
            lifecycle_status = ${expectedLifecycle}, version = version + 1,
            updated_at = transaction_timestamp()
        WHERE id = ${listingId}
      `;
      await transaction`
        DELETE FROM app.listing_daily_totals WHERE listing_id = ${listingId}
      `;
      await transaction`
        INSERT INTO app.listing_daily_totals (
          listing_id, business_date, net_amount_paise, total_reached_at,
          last_ledger_entry_id, updated_at
        )
        SELECT ${listingId}, aggregate.business_date,
               aggregate.net_amount_paise, latest.applied_at, latest.id,
               transaction_timestamp()
        FROM (
          SELECT applied_business_date AS business_date,
                 sum(amount_delta_paise)::bigint AS net_amount_paise
          FROM private.financial_ledger WHERE listing_id = ${listingId}
          GROUP BY applied_business_date
        ) AS aggregate
        JOIN LATERAL (
          SELECT id, applied_at FROM private.financial_ledger
          WHERE listing_id = ${listingId}
            AND applied_business_date = aggregate.business_date
          ORDER BY applied_at DESC, id DESC LIMIT 1
        ) AS latest ON true
      `;
    }

    await transaction`
      INSERT INTO private.reconciliation_items (
        run_id, provider_object_type, provider_object_id, listing_id,
        discrepancy_type, expected, actual, state, resolution, resolved_at
      ) VALUES (
        ${runId}, 'projection', ${lockedListing.public_id}, ${listingId},
        'manual_projection_repair', ${JSON.stringify(expected)}::jsonb,
        ${JSON.stringify(actual)}::jsonb, ${apply ? "resolved" : "open"},
        ${apply ? `rebuilt_from_append_only_ledger: ${reason.trim()}` : "dry_run_only"},
        ${apply ? now : null}
      )
    `;
    return { actual, applied: apply, expected, listingId, runId };
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  await sql.end({ timeout: 5 });
}
