# GoneViral.in

GoneViral.in is a paid public leaderboard for the Indian internet. The repository is in **Phase 15 private staging certification**. Dodo Payments is the current provider behind replaceable checkout, event, reconciliation and two-stage refund adapters; only authoritative server-to-server confirmation can commit the immutable PostgreSQL ledger. Verified sponsors can claim, privately view, raise and safely edit listings through Supabase passwordless Auth. Versioned transactional notifications leave financial and admin transactions through a durable email outbox. The application now has PII-scrubbed Sentry/log boundaries, correlation IDs, enforced browser security headers, safe health probes, aggregate operational alerts, admin abuse signals, build leakage checks, documented secret rotation, encrypted hosted backup and guarded prelaunch-cleanup tooling, and deterministic partial-failure/restore drills. Synthetic activity is restricted to local fixtures and deterministic local Dodo, email, Turnstile, and storage doubles.

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

Copy `.env.example` to `.env.local` for local database integration values. Payments default to deterministic local Dodo and Turnstile adapters; application email defaults to its deterministic mock. Owner-flow tests use the real local Supabase Auth service; hosted magic-link delivery requires Resend custom SMTP. See [`docs/DATABASE_WORKFLOW.md`](./docs/DATABASE_WORKFLOW.md) for database boundaries, [`docs/PAYMENTS_AND_RAISES.md`](./docs/PAYMENTS_AND_RAISES.md) for sponsorship and raise semantics, [`docs/FINANCIAL_ADJUSTMENTS_AND_RECONCILIATION.md`](./docs/FINANCIAL_ADJUSTMENTS_AND_RECONCILIATION.md) for Dodo adjustment mapping, reconciliation, and ledger-authoritative repair, [`docs/AUTH_AND_SMTP.md`](./docs/AUTH_AND_SMTP.md) for owner identity and hosted-email gates, [`docs/TRANSACTIONAL_EMAIL_OPERATIONS.md`](./docs/TRANSACTIONAL_EMAIL_OPERATIONS.md) for Resend delivery, idempotency, privacy and support operations, [`docs/OBSERVABILITY_SECURITY_AND_FAILURE_DRILLS.md`](./docs/OBSERVABILITY_SECURITY_AND_FAILURE_DRILLS.md) for Sentry, logs, headers, metrics, rotation, health and recovery drills, [`docs/LOGOS_AND_EDITS.md`](./docs/LOGOS_AND_EDITS.md) for the private staging, sanitization, cleanup, and review policy, [`docs/MODERATION_AND_ADMIN_OPERATIONS.md`](./docs/MODERATION_AND_ADMIN_OPERATIONS.md) for reports, admin enrollment, roles, emergency flags and Dodo refund operations, and [`docs/CLICKS_ACTIVITY_AND_SHARING.md`](./docs/CLICKS_ACTIVITY_AND_SHARING.md) for outbound safety, click privacy/retention and truthful sharing.

## Commands

```powershell
pnpm dev
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm security:verify-build
pnpm ops:rehearse-restore
pnpm ops:backup:hosted
pnpm ops:deploy:preview
pnpm ops:prelaunch-cleanup -- --backup-archive <absolute-verified-backup.7z>
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

- Phase 15 risk-based private-staging certification is recorded in
  `docs/PHASE_15_STAGING_CURRENT_STATE.md`. Read that checkpoint before repeating
  hosted provider, Auth, email, Storage, admin, or browser work.
- The protected Preview and hosted Supabase project are staging-only. Payments
  and provider refunds are disabled, Dodo remains in Test Mode, and staging
  credentials/configuration must never be promoted to production.
- The complete Phase 15 matrix is not certified. Open gates include an isolated
  hosted-backup restore rehearsal, exhaustive browser/accessibility coverage,
  automatic sub-daily scheduler evidence on supporting infrastructure, and
  production-specific configuration.
- Production remains blocked on written Dodo model approval, KYC/entity/bank
  setup, live credentials, counsel-reviewed legal requirements, CA-approved
  accounting/GST/invoice handling, Vercel Pro, Supabase Pro/PITR, production
  isolation, domain/DNS/TLS/email authentication, security/access review,
  monitoring, backup/restore, and explicit owner authorization.
