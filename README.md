# GoneViral.in

GoneViral.in is a paid public leaderboard for the Indian internet. The repository is complete through **Phase 11**. Dodo Payments is the current provider behind replaceable checkout, event, reconciliation and two-stage refund adapters; only authoritative server-to-server confirmation can commit the immutable PostgreSQL ledger. Verified sponsors can claim, privately view, raise and safely edit listings through Supabase passwordless Auth. Safe slug-only outbound redirects now produce privacy-preserving unique daily click aggregates with eight-day dedupe retention; clicks are visibly separate and have no ranking influence. Public activity, listing metadata, generated share images and confirmation-page sharing derive only from committed real state and actual current rank. Public reports and all admin or owner operations remain authorization-bound and auditable. Synthetic activity is restricted to local fixtures and the deterministic local Dodo mock.

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

Copy `.env.example` to `.env.local` for local database integration values. Payments default to deterministic local Dodo and Turnstile adapters. Owner-flow tests use the real local Supabase Auth service; hosted magic-link delivery requires Resend custom SMTP. See [`docs/DATABASE_WORKFLOW.md`](./docs/DATABASE_WORKFLOW.md) for database boundaries, [`docs/PAYMENTS_AND_RAISES.md`](./docs/PAYMENTS_AND_RAISES.md) for sponsorship and raise semantics, [`docs/FINANCIAL_ADJUSTMENTS_AND_RECONCILIATION.md`](./docs/FINANCIAL_ADJUSTMENTS_AND_RECONCILIATION.md) for Dodo adjustment mapping, reconciliation, and ledger-authoritative repair, [`docs/AUTH_AND_SMTP.md`](./docs/AUTH_AND_SMTP.md) for owner identity and hosted-email gates, [`docs/LOGOS_AND_EDITS.md`](./docs/LOGOS_AND_EDITS.md) for the private staging, sanitization, cleanup, and review policy, [`docs/MODERATION_AND_ADMIN_OPERATIONS.md`](./docs/MODERATION_AND_ADMIN_OPERATIONS.md) for reports, admin enrollment, roles, emergency flags and Dodo refund operations, and [`docs/CLICKS_ACTIVITY_AND_SHARING.md`](./docs/CLICKS_ACTIVITY_AND_SHARING.md) for outbound safety, click privacy/retention and truthful sharing.

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
pnpm db:repair-projections -- --listing <uuid> --reason "incident reason"
pnpm test:database
pnpm db:fixtures:phase3
pnpm db:fixtures:clear
```

The local app is available at `http://localhost:3000`. Seeded local board data uses reserved `.example.test` destinations and must never be presented as public activity. No production integration is represented as configured or approved.

## Current external gates

- No hosted Supabase development or production project exists yet; only the local Docker-backed stack is verified.
- No Vercel project/deployment exists yet.
- The local Supabase Storage service is unavailable in the current environment. Logo security and lifecycle tests use deterministic Storage doubles; a real signed private upload/public derivative test remains an explicit hosted or repaired-local-infrastructure gate.
- Dodo Payments is the current hosted-checkout and webhook provider behind replaceable checkout and event adapters. Test mode requires a Dodo test API key, business ID, webhook key, and a one-time INR `pay_what_you_want` product. The local mock signs exact raw payloads with Standard Webhooks. Live credentials or approval are not assumed.
- Resend custom SMTP, sender-domain DNS verification, and a genuine hosted staging magic-link delivery/replay test are not yet available and are not represented as complete.
- Hosted admin enrollment, verified MFA/re-auth configuration and a genuine role-bypass smoke test require a hosted Supabase environment and human security ceremony; local service and permission tests do not claim those gates are complete.
- Legal, privacy, refund and accounting launch approvals remain open.
