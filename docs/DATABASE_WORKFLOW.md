# Database workflow

GoneViral's database foundation uses PostgreSQL 17 through the Supabase CLI, Drizzle ORM for typed schema and queries, and postgres.js for runtime connections. Supabase migration history is the only authority for applying migrations.

## Local prerequisites

- Node.js `24.20.0`
- pnpm `11.24.0`
- Docker Desktop with the Linux engine running
- Supabase CLI `2.116.0`

Start the reduced local stack, reset it from committed migrations, and verify it:

```powershell
pnpm db:start
pnpm db:reset
pnpm db:migrations:verify
pnpm db:schema:verify
pnpm db:lint
pnpm db:advisors
pnpm test:database
```

`pnpm db:reset` is destructive and is only for the local Supabase database. Stop the stack with `pnpm db:stop`. The local services bind Docker ports on the development machine and must not be exposed to an untrusted network.

## Connections and secrets

Keep connection strings in ignored `.env.local` or platform-managed secrets. Never commit production credentials. Local development can use:

```dotenv
DATABASE_URL=postgresql://postgres.pooler-dev:postgres@127.0.0.1:54329/postgres
DATABASE_DIRECT_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

`DATABASE_URL` is the runtime transaction-pool connection. The postgres.js client disables prepared statements and restores PostgreSQL `bigint` values as JavaScript `bigint`. `DATABASE_DIRECT_URL` is the direct connection used only by migration tooling and administrative verification.

For a hosted non-production environment, copy the exact transaction-pool and direct connection strings from that Supabase project's Connect panel. The runtime login must be a dedicated login role with only the privileges represented by `goneviral_app`; do not run the application as `postgres`, a database owner, or a service role. Hosted credentials and infrastructure are deliberately not fabricated in this phase.

## Schema and migration workflow

- Typed schema definitions live in `src/server/db/schema/`.
- Drizzle snapshots and generation metadata live in `drizzle/meta/`.
- Reviewed, executable SQL lives only in `supabase/migrations/`.
- `app` and `private` are not Data API schemas. Browser roles and PostgreSQL `PUBLIC` receive no access.

For every schema change:

1. Create the authoritative migration shell with `supabase migration new <name>`.
2. Edit the Drizzle schema.
3. Generate SQL with `pnpm exec drizzle-kit generate --name=<name>` while `DATABASE_DIRECT_URL` is set.
4. Review and promote the generated SQL into the Supabase migration shell. Add any required PostgreSQL-specific roles, grants, triggers, or reference-data statements by hand.
5. Apply from an empty local database with `pnpm db:reset`.
6. Run the migration-order, schema, lint, advisor, and integration checks shown above.

Do not use `drizzle-kit migrate`: it would create a second migration-history authority. The committed Phase 2 SQL was generated from the Drizzle schema, manually reviewed, supplemented with explicit constraints and permissions, and then tested through Supabase reset.

## Phase 3 local fixtures

The public read model works against real database projections and does not contain a fallback data array. To exercise populated, tie, Today, category, and hidden-state behavior locally:

```powershell
pnpm db:fixtures:phase3
pnpm dev
```

Clear all synthetic listing activity when finished:

```powershell
pnpm db:fixtures:clear
```

Both commands are guarded against `NODE_ENV=production` and refuse any database host other than local Supabase on port `54322`. Seeding uses reserved `.example.test` destinations and creates private financial records solely to drive realistic public projections. The scripts truncate listing-owned fixture data, so they must never target a shared or hosted database. An empty database is the canonical production-safe baseline.

## Security and data invariants

- Financial and ranking amounts use `bigint` paise only; floating-point SQL types are forbidden.
- Six canonical categories are owned by the foundation migration and are idempotently upserted.
- Financial ledger, moderation, audit, and screening histories are append-only.
- Original sponsorship attribution and payment intent identity fields are immutable after creation.
- Canonical provider event/payment identities and fulfillment identities are uniquely constrained.
- Aggregate counters have schema defaults and nonnegative constraints, but later phases must update them only through reviewed transactional services.
- Repository DTOs expose an explicit public-safe field allowlist. Private repository paths remain server-only.

The local Data API verification makes real requests and requires both `app` and `private` schema selection to fail. Phase 3 adds server-only public queries and tagged Next.js caches, but does not create a public Data API, hosted database, browser CRUD path, payment integration, auth flow, or production data.
