# GoneViral.in

GoneViral.in is a paid public leaderboard for the Indian internet. The repository is complete through **Phase 5**: Dodo Payments guest checkout and authoritative server-to-server webhook confirmation are implemented behind replaceable provider adapters, with exact-once fulfilment on the immutable PostgreSQL ledger. The board uses database projections; synthetic activity is restricted to local fixtures and the deterministic local Dodo mock.

The authoritative specification pack starts at [`goneviral-specs/README_FOR_CODEX.md`](./goneviral-specs/README_FOR_CODEX.md). `00_DECISIONS_AND_PRODUCT_RULES.md` is canonical product law.

## Local prerequisites

- Node.js `24.20.0` (see `.node-version`)
- Corepack enabled
- pnpm `11.24.0` (pinned by `packageManager`)
- Docker Desktop with the Linux engine running
- Supabase CLI `2.116.0`

```powershell
corepack enable
corepack prepare pnpm@11.24.0 --activate
pnpm install --frozen-lockfile
```

Copy `.env.example` to `.env.local` for local database integration values. Phase 4 defaults to deterministic local Dodo and Turnstile adapters, so it does not require hosted Supabase, Dodo, Resend, Turnstile, Sentry, or Vercel credentials. See [`docs/DATABASE_WORKFLOW.md`](./docs/DATABASE_WORKFLOW.md) for the database, fixture, and security boundaries.

## Commands

```powershell
pnpm dev
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm db:start
pnpm db:reset
pnpm db:migrations:verify
pnpm db:schema:verify
pnpm db:lint
pnpm db:advisors
pnpm test:database
pnpm db:fixtures:phase3
pnpm db:fixtures:clear
```

The local app is available at `http://localhost:3000`. Seeded local board data uses reserved `.example.test` destinations and must never be presented as public activity. No production integration is represented as configured or approved.

## Current external gates

- No hosted Supabase development or production project exists yet; only the local Docker-backed stack is verified.
- No Vercel project/deployment exists yet.
- Dodo Payments is the current hosted-checkout and webhook provider behind replaceable checkout and event adapters. Test mode requires a Dodo test API key, business ID, webhook key, and a one-time INR `pay_what_you_want` product. The local mock signs exact raw payloads with Standard Webhooks. Live credentials or approval are not assumed.
- Legal, privacy, refund and accounting launch approvals remain open.
