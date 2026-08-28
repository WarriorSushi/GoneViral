# GoneViral.in

GoneViral.in is a paid public sponsored leaderboard for the Indian internet. The repository is currently complete through **Phase 3**: the reproducible engineering foundation, versioned domain policy, private PostgreSQL foundation, strict public read model, and responsive public board shell. The board uses database projections; synthetic activity is restricted to the local fixture command and the real empty database renders an honest empty state. Provider integrations, checkout, ownership, and moderation operations have not been implemented yet.

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

Copy `.env.example` to `.env.local` for local database integration values. Phase 3 uses only local Supabase defaults and does not require hosted Supabase, Cashfree, Resend, Turnstile, Sentry, or Vercel credentials. See [`docs/DATABASE_WORKFLOW.md`](./docs/DATABASE_WORKFLOW.md) for the database, fixture, and security boundaries.

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
- Cashfree is a conditional candidate only; no merchant approval or credentials are assumed.
- Legal, privacy, refund and accounting launch approvals remain open.
