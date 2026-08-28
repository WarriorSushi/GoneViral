import postgres from "postgres";

const directDatabaseUrl =
  process.env.DATABASE_DIRECT_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const parsedDatabaseUrl = new URL(directDatabaseUrl);
const command = process.argv[2] ?? "seed";

if (process.env.NODE_ENV === "production") {
  throw new Error(
    "Phase 3 synthetic fixtures are forbidden in production mode.",
  );
}

if (
  !["127.0.0.1", "localhost"].includes(parsedDatabaseUrl.hostname) ||
  parsedDatabaseUrl.port !== "54322"
) {
  throw new Error(
    "Phase 3 synthetic fixtures may only target local Supabase on port 54322.",
  );
}

if (!["clear", "seed"].includes(command)) {
  throw new Error("Usage: phase3-fixtures.mjs [seed|clear]");
}

const sql = postgres(directDatabaseUrl, {
  max: 1,
  prepare: false,
  types: { bigint: postgres.BigInt },
});

const categories = {
  people: "00000000-0000-4000-8000-000000000001",
  tech: "00000000-0000-4000-8000-000000000002",
  brands: "00000000-0000-4000-8000-000000000003",
  b2b: "00000000-0000-4000-8000-000000000004",
  media: "00000000-0000-4000-8000-000000000005",
};

const fixtures = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    slug: "monsoon-studio",
    name: "Monsoon Studio",
    tagline: "Independent motion and identity practice from Mumbai.",
    destination: "https://monsoon-studio.example.test",
    categoryId: categories.b2b,
    total: 2_500_000n,
    today: true,
    minutes: 11,
    lifecycle: "active",
    moderation: "clear",
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    slug: "nukkad-notes",
    name: "Nukkad Notes",
    tagline: "A weekly field note on Indian internet culture.",
    destination: "https://nukkad-notes.example.test",
    categoryId: categories.media,
    total: 1_250_000n,
    today: true,
    minutes: 18,
    lifecycle: "active",
    moderation: "clear",
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    slug: "plotline-app",
    name: "Plotline",
    tagline: "Story planning that stays out of the writer’s way.",
    destination: "https://plotline.example.test",
    categoryId: categories.tech,
    total: 1_000_000n,
    today: false,
    minutes: 22,
    lifecycle: "active",
    moderation: "clear",
  },
  {
    id: "10000000-0000-4000-8000-000000000004",
    slug: "chai-and-code",
    name: "Chai & Code",
    tagline: "Practical engineering stories for curious builders.",
    destination: "https://chai-and-code.example.test",
    categoryId: categories.people,
    total: 1_000_000n,
    today: false,
    minutes: 27,
    lifecycle: "active",
    moderation: "clear",
  },
  {
    id: "10000000-0000-4000-8000-000000000005",
    slug: "mitti-home",
    name: "Mitti Home",
    tagline: "Small-batch objects for slower Indian homes.",
    destination: "https://mitti-home.example.test",
    categoryId: categories.brands,
    total: 499_900n,
    today: true,
    minutes: 31,
    lifecycle: "active",
    moderation: "clear",
  },
  {
    id: "10000000-0000-4000-8000-000000000006",
    slug: "suspended-fixture",
    name: "Suspended Fixture",
    tagline: "Synthetic hidden-state verification only.",
    destination: "https://suspended.example.test",
    categoryId: categories.tech,
    total: 9_000_000n,
    today: true,
    minutes: 7,
    lifecycle: "active",
    moderation: "suspended",
  },
  {
    id: "10000000-0000-4000-8000-000000000007",
    slug: "removed-fixture",
    name: "Removed Fixture",
    tagline: "Synthetic hidden-state verification only.",
    destination: "https://removed.example.test",
    categoryId: categories.tech,
    total: 8_000_000n,
    today: true,
    minutes: 8,
    lifecycle: "removed",
    moderation: "clear",
  },
  {
    id: "10000000-0000-4000-8000-000000000008",
    slug: "reversed-fixture",
    name: "Reversed Fixture",
    tagline: "Synthetic hidden-state verification only.",
    destination: "https://reversed.example.test",
    categoryId: categories.brands,
    total: 0n,
    original: 49_900n,
    reversed: true,
    today: false,
    minutes: 34,
    lifecycle: "inactive_reversed",
    moderation: "clear",
  },
];

function istNoonForOffset(dayOffset, minutes) {
  const now = new Date();
  const ist = new Date(now.getTime() + 19_800_000);
  return new Date(
    Date.UTC(
      ist.getUTCFullYear(),
      ist.getUTCMonth(),
      ist.getUTCDate() + dayOffset,
      6,
      30,
      minutes,
    ),
  );
}

try {
  await sql.begin(async (transaction) => {
    await transaction`truncate table app.listings cascade`;

    if (command === "clear") {
      return;
    }

    for (const fixture of fixtures) {
      const appliedAt = istNoonForOffset(
        fixture.today ? 0 : -1,
        fixture.minutes,
      );
      const rankReachedAt = fixture.reversed
        ? new Date(appliedAt.getTime() + 60_000)
        : appliedAt;
      const originalAmount = fixture.original ?? fixture.total;
      const pendingOwnerId = fixture.id.replace("10000000", "20000000");
      const attemptId = fixture.id.replace("10000000", "30000000");
      const ledgerId = fixture.id.replace("10000000", "40000000");
      const url = new URL(fixture.destination);

      await transaction`
        insert into app.listings (
          id, public_id, slug, name, name_normalized, tagline,
          destination_url, destination_canonical_key, destination_host,
          category_id, lifecycle_status, moderation_status,
          confirmed_total_paise, original_sponsorship_paise,
          current_total_reached_at, first_confirmed_at, last_rank_change_at,
          category_locked_at
        ) values (
          ${fixture.id}, ${`fixture-${fixture.slug}`}, ${fixture.slug},
          ${fixture.name}, ${fixture.name.toLocaleLowerCase("en-IN")},
          ${fixture.tagline}, ${fixture.destination}, ${url.host}, ${url.host},
          ${fixture.categoryId}, ${fixture.lifecycle}, ${fixture.moderation},
          ${fixture.total}, ${originalAmount}, ${rankReachedAt}, ${appliedAt},
          ${rankReachedAt}, ${appliedAt}
        )
      `;

      await transaction`
        insert into private.pending_listing_owners (
          id, listing_id, canonical_email, email_hash, claim_state
        ) values (
          ${pendingOwnerId}, ${fixture.id},
          ${`${fixture.slug}@example.test`},
          ${`synthetic-hmac-${fixture.slug}`}, 'pending'
        )
      `;

      await transaction`
        insert into private.payment_attempts (
          id, public_id, application_idempotency_key, provider,
          provider_environment, listing_id, purpose, state, amount_paise,
          currency, policy_version, minimum_required_paise_snapshot,
          listing_total_paise_snapshot, pending_owner_id,
          provider_order_request_hash, checkout_expires_at, created_at
        ) values (
          ${attemptId}, ${`fixture-attempt-${fixture.slug}`},
          ${`fixture-idempotency-${fixture.slug}`}, 'fixture', 'local',
          ${fixture.id}, 'initial_sponsorship', 'checkout_ready',
          ${originalAmount}, 'INR', '2026-08-28-v1', 49900, 0,
          ${pendingOwnerId}, ${`fixture-request-${fixture.slug}`},
          ${new Date(appliedAt.getTime() + 1_800_000)}, ${appliedAt}
        )
      `;

      await transaction`
        insert into private.financial_ledger (
          id, listing_id, entry_type, amount_delta_paise, currency,
          payment_attempt_id, policy_version, applied_at,
          applied_business_date, source_key, source_provider,
          source_environment
        ) values (
          ${ledgerId}, ${fixture.id}, 'initial_sponsorship', ${originalAmount},
          'INR', ${attemptId}, '2026-08-28-v1', ${appliedAt},
          (${appliedAt}::timestamptz at time zone 'Asia/Kolkata')::date,
          ${`fixture-ledger-${fixture.slug}`}, 'fixture', 'local'
        )
      `;

      await transaction`
        update private.payment_attempts
        set state = 'succeeded', fulfilled_ledger_entry_id = ${ledgerId},
            succeeded_at = ${appliedAt}, updated_at = ${appliedAt}
        where id = ${attemptId}
      `;

      let lastLedgerId = ledgerId;

      if (fixture.reversed) {
        lastLedgerId = fixture.id.replace("10000000", "50000000");
        await transaction`
          insert into private.financial_ledger (
            id, listing_id, entry_type, amount_delta_paise, currency,
            policy_version, applied_at, applied_business_date, source_key,
            source_provider, source_environment
          ) values (
            ${lastLedgerId}, ${fixture.id}, 'refund', ${-originalAmount},
            'INR', '2026-08-28-v1', ${rankReachedAt},
            (${rankReachedAt}::timestamptz at time zone 'Asia/Kolkata')::date,
            ${`fixture-refund-${fixture.slug}`}, 'fixture', 'local'
          )
        `;
      }

      await transaction`
        insert into app.listing_daily_totals (
          listing_id, business_date, net_amount_paise,
          total_reached_at, last_ledger_entry_id, updated_at
        ) values (
          ${fixture.id},
          (${rankReachedAt}::timestamptz at time zone 'Asia/Kolkata')::date,
          ${fixture.total}, ${rankReachedAt}, ${lastLedgerId}, ${rankReachedAt}
        )
      `;
    }
  });

  console.log(
    command === "clear"
      ? "Cleared local Phase 3 synthetic fixtures."
      : `Seeded ${fixtures.length} local Phase 3 synthetic listings, including hidden-state fixtures.`,
  );
} finally {
  await sql.end({ timeout: 5 });
}
