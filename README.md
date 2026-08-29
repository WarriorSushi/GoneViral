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

- The empty hosted Supabase staging project `fndssapjkaicxzeruuvv` is linked in Mumbai with committed migrations, disabled legacy API keys, modern API keys, and the reviewed private/public Storage buckets. It is not a production project. Exact hosted Auth redirects, end-to-end application flows, and a clean replacement encrypted backup/off-device copy remain open gates.
- A login-protected Vercel Preview exists with automatic Git deployments disabled, Mumbai Functions configured, `PAYMENTS_ENABLED=false`, and safe mock provider modes. Vercel Hobby rejects the committed sub-daily production schedules, so the technical preview uses `vercel.preview.json`; automatic scheduler certification requires a supporting paid plan and separate owner approval.
- Real signed private Storage upload, sanitisation, publication, and cleanup remain hosted-certification gates; deterministic local Storage doubles do not satisfy them.
- Dodo Payments is the current hosted-checkout and webhook provider behind replaceable checkout and event adapters. Test mode requires a Dodo test API key, business ID, webhook key, and a one-time INR `pay_what_you_want` product. The local mock signs exact raw payloads with Standard Webhooks. Live credentials or approval are not assumed.
- Resend API delivery, signed delivery webhooks, custom SMTP, sender-domain DNS verification, worker scheduling, and genuine hosted staging notification/magic-link delivery and replay tests are not yet available and are not represented as complete.
- The hosted Sentry project exists, but source-map upload, a safe test event, alert destination, Vercel observability/WAF, external penetration test, and hosted PITR restore are not yet certified. Local scrubbing, headers, metrics, failure tests and temporary-table restore fingerprints do not satisfy those launch gates.
- Hosted admin enrollment, verified MFA/re-auth configuration and a genuine role-bypass smoke test require a hosted Supabase environment and human security ceremony; local service and permission tests do not claim those gates are complete.
- Versioned owner-approved legal, privacy, refund, content, paid-placement, copyright, and contact policies are effective. Accounting, GST/invoice, provider, infrastructure, and production approvals remain open; independent counsel is optional rather than a launch blocker.
