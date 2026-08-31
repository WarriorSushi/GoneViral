# Phase 15 staging certification and launch runbook

## Authority and current boundary

Product and money invariants follow
`goneviral-specs/00_DECISIONS_AND_PRODUCT_RULES.md`, then the database, payment,
and security contracts in
`goneviral-specs/03_DATABASE_PAYMENTS_AND_SECURITY.md`, then the Phase 15 plan
and operational specification. The user-approved execution prompt may narrow
or replace topology choices for this phase; it authorises one empty hosted
Supabase Free project for private staging certification, not commercial live
money. This runbook does not authorise production promotion, public domain
attachment, or a live payment. Each requires separate explicit confirmation
immediately before the action.

The policies at version `2026-08-29-v1` are effective owner-approved copy.
That status does not claim independent counsel, CA/accounting, Dodo
underwriting, KYC, security, or infrastructure approval.

## Secret-handling rule

Use official browser login or local masked prompts. Never paste Supabase,
Vercel, Dodo, Resend, Sentry, Turnstile, database, SMTP, DNS, or encryption
credentials into chat. Before linking, run `pnpm exec supabase login`, sign in
to the correct AltCorp account in the browser, and verify `pnpm exec supabase
projects list`. Link only the explicitly identified empty project and confirm
its ref and region before migration.

Keep provider keys in the matching hosted environment. Never echo or inspect
secret values after writing them. Record only names, environment, timestamps,
project refs, deployment IDs, checksums, and pass/fail evidence.

## Local release gate

Start from a clean `codex/phase-15-staging` branch. Record Node, pnpm,
Supabase CLI, baseline commit, origin, and current Next.js/provider changelog
review. Before hosted writes run the complete repository command matrix:

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm test:database
pnpm perf:query-plans
pnpm test:performance
pnpm build
pnpm security:verify-build
pnpm test:e2e
pnpm db:migrations:verify
node scripts/db/verify-schema.mjs
pnpm db:schema:verify
pnpm db:lint
pnpm db:advisors
pnpm audit --audit-level=moderate
```

Do not weaken a failed gate. Preserve verbose logs in ignored evidence only
when needed and report concise excerpts and exact failures.

## Hosted Supabase staging sequence

1. Verify correct-account browser login, empty target identity, Free plan,
   region, and project ref. Do not reuse a project containing real or unknown
   data.
2. Link the project and inspect the migration plan. Apply committed migrations
   in order; never repair migration history without first proving the actual
   schema and committed checksum.
3. Push reviewed `supabase/config.toml` only after exact Vercel preview/staging
   URLs are known. Use exact Auth site/redirect URLs; no wildcards. Anonymous
   sign-in stays disabled. Confirm `app`/`private` are not exposed through the
   Data API and new schemas do not auto-expose.
4. Verify the six active categories, triggers, grants, RLS/Data API denial,
   advisors, migration list, Storage bucket privacy/type/size settings, Auth
   redirect behaviour, and database/runtime connection separation.
5. Immediately create and verify an encrypted full logical and Storage backup:

   ```powershell
   pnpm ops:backup:hosted
   ```

   Store the prompted archive passphrase in the approved password manager.
   Record archive path, SHA-256 evidence path, project ref, Git commit, UTC
   timestamp, and verification result. Do not commit backup material. An
   off-device private copy contains only the `.7z` archive and its matching
   `.7z.sha256`; never copy the plaintext timestamp directory or SQL files.

6. Rehearse restoration only into a disposable empty local/non-production
   target. Never restore over the linked database. Verify migrations, schema,
   row counts/fingerprints, categories, financial identities, projections,
   triggers, grants, RLS, Storage inventory, and recovery duration.

## Hosted configuration matrix

The staging deployment must use the linked staging Supabase project, Dodo
`test_mode`, safe recipient-controlled Resend configuration, Cloudflare
Turnstile, and a staging Sentry project. It must start with
`PAYMENTS_ENABLED=false`; the database `payments_enabled` and
`provider_refunds_enabled` flags also remain false until their individual test
steps. Preview credentials must never be copied into Production scope.

Required server settings include transaction-pool `DATABASE_URL`, direct
administrative `DATABASE_DIRECT_URL`, Supabase secret key, independent HMAC and
encryption keys, `CRON_SECRET`, and the matching provider/email/observability
secrets. Public settings contain only the exact site/Supabase URL, publishable
key, Turnstile site key, and intentionally public Sentry DSN. Preserve the
configured Mumbai function/database proximity where supported.

The committed `vercel.preview.json` is only for the private Hobby technical
preview. It preserves the Mumbai function region but omits automatic schedules,
because Vercel validates the production cron expressions during a preview build
and Hobby rejects schedules that run more than daily. Deploy it with
`pnpm ops:deploy:preview`; the script selects the Preview target, temporarily
excludes only the production schedule file during upload, and restores it in a
`finally` block. Manually invoke and verify the authenticated cron routes in
preview, but do not claim scheduler certification. Production continues to use
the schedules in `vercel.json` and therefore requires a plan that supports their
one-minute/five-minute/hourly frequencies.

Before enabling Dodo test checkout, verify business ID, webhook key, API key,
and one-time INR pay-what-you-want product all belong to the same test
environment. Register only the exact staging webhook and return URLs. Webhook
signature verification and the immutable ledger remain financial authority;
browser return state never does.

## Staging certification matrix

Run on a protected, noindex staging deployment with unmistakably synthetic data
and controlled recipients:

- empty board, all-time/Today/category/listing ranking and deterministic ties;
- initial checkout success, failure, abandonment, delayed and duplicate event;
- partial/full refund, chargeback, restoration, event reordering, and
  reconciliation repair exactly once;
- owner magic-link claim, raise, logo edit/sanitisation, destination change,
  and cross-owner denial;
- report, moderation, admin role denial/approval, two-stage refund, and audit;
- transactional email delivery/webhook/replay, Auth SMTP, and safe failure;
- safe redirect/click dedupe, sitemap/robots/canonical/legal disclosure;
- cron authentication/idempotency, operational alerts, Sentry scrubbing,
  security headers, CSP, Storage privacy, and secrets/build leakage;
- Chromium/Firefox/WebKit and responsive 320/390/412/834/1440 visual,
  accessibility, keyboard, screen-reader/manual-device checks;
- hosted query/lock/latency observations without destructive live load.

Record provider/dashboard evidence and aggregates only. Do not store customer
PII, signed URLs, raw webhook bodies, magic links, or secrets in evidence.

## Prelaunch cleanup

After staging certification and before any production decision, leave Dodo in
`test_mode`, set `PAYMENTS_ENABLED=false`, and disable provider refunds. Create
a new verified backup. Then run:

```powershell
pnpm ops:prelaunch-cleanup -- --backup-archive D:\GoneViral-Backups\<timestamp>-<project-ref>.7z
```

Review aggregate counts, re-enter the archive passphrase, and type the exact
project-bound deletion phrase only after confirming every row/object/user is
test data. The script aborts rather than touching live, unknown, non-INR, or
admin-corrected financial history. Verify afterward that public boards,
activity, sitemap listings, Auth users, and both Storage buckets are empty;
the six categories and safe disabled flags remain. Preserve the non-sensitive
cleanup report beside the encrypted backup.

## Production and live-money hard gates

Do not promote or attach `goneviral.in` until the user separately confirms the
specific action and genuine evidence exists for Vercel Pro, Supabase Pro/PITR,
production isolation, DNS/TLS/email authentication, backup/restore, alerts,
access/MFA, security review, counsel-reviewed legal/privacy/refund/content/
disclosure/grievance requirements, CA-approved accounting/GST/invoice/place-of-
supply handling, Dodo written model approval, KYC/entity/bank setup, and live
credentials. The effective owner-approved policies are product copy, not
evidence that the separate counsel and CA launch gates have passed.

Even after those gates, deploy first with payments disabled. Smoke public,
Auth, admin, cron, webhook, and reconciliation reads. Register exact live URLs,
then request a separate immediate confirmation for one controlled low-value
founder-owned live transaction. Verify provider event to exactly one payment,
ledger entry, lifetime/daily projection, board, email, and reconciliation.
Never fabricate a transaction or sign-off.

## Incident and rollback rule

Code may roll back; confirmed financial history does not. On uncertainty set
payments/refunds off and, when required, read-only while continuing to accept
and safely retry authoritative provider events. Never overwrite newer provider
transactions with an old backup. Restore only to an isolated target, compare
provider evidence, reconcile, and apply reviewed forward repairs. Record the
commit, migration/config version, deployment, flags, backup checksum, incident
timeline, owner decisions, and final verification.
