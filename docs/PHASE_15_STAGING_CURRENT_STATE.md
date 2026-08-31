# Phase 15 private staging current state

Last updated: 2026-08-31 (Asia/Kolkata)

This is a sanitized, non-authoritative certification record for the Phase 15
private staging work on `codex/phase-15-staging`. Read the authority
order and acceptance rules in the specifications and
`PHASE_15_STAGING_CERTIFICATION_AND_LAUNCH.md` before making decisions. Update
this file after material external-state changes. Do not place secret values,
credentials, magic links, MFA material, webhook bodies, card data, recipient
addresses, or backup passphrases here.

## Scope and owner decision

- Private staging only. Production, `goneviral.in`, live credentials, live
  payments, and Phase 16 are not authorized.
- Dodo remains in Test Mode. The Preview is protected and noindex.
- The owner chose a risk-based critical path to conserve Codex usage. Prioritize
  money correctness, authorization, data privacy, infrastructure isolation, and
  safe shutdown. Record all other checks honestly as deferred/unverified; do
  not claim the complete Phase 15 matrix passed.
- Do not repeat settled tests without a new failure, changed deployment, or
  other evidence that invalidates the earlier result.
- Risk-based certification was committed cleanly as
  `4bc73d9716215f8dcf8960706280ed12418e7ab3`. Any later closure fixes or newly
  authorized deferred-gate evidence must be committed separately; preserve
  unrelated owner changes and do not rewrite that certification commit.
- Local deferred-gate closure was committed as
  `194f01ae9acea5694ef27dd5e8b93ac2dc8a4352` and pushed to the existing
  `origin/codex/phase-15-staging` branch. Local and remote refs matched exactly
  before the restore rehearsal; no deployment or hosted-service command was
  run as part of that push.

## Repository and connected staging services

- Workspace: `C:\coding\goneviral`
- Branch: `codex/phase-15-staging`
- Pre-certification source HEAD and hosted-backup source commit:
  `682969e41cbfba73bb4b2d81681eb2abd2dbe509`
- Stable protected Preview:
  `https://goneviral-phase15-preview-warriorsushis-projects.vercel.app`
- Vercel project ID: `prj_pvt3u8wDLvJ3C4X9QTB7AlHUvL12`
- Vercel scope: `warriorsushis-projects`
- Deployment behind the stable alias when this checkpoint was written:
  `https://goneviral-2dviyh4iv-warriorsushis-projects.vercel.app`
- Deployment ID at this checkpoint:
  `dpl_Cri4g8B93gRUsWHokoLGMEe4kDfB`
- The repository is linked and the Vercel CLI is authenticated. Use
  `pnpm.cmd exec vercel ...` from the workspace. Production Vercel state must
  remain untouched.
- Hosted Supabase staging project: `fndssapjkaicxzeruuvv`, Mumbai. The Supabase
  plugin/MCP connection is authenticated to the correct staging project.
  Prefer aggregate/redacted read-only evidence and follow the Supabase skill.
- Application transactional email genuinely uses Resend in Preview, and the
  signed webhook has advanced tested messages to `delivered`. Supabase Auth
  custom SMTP is separate and has genuinely delivered the branded management
  magic link. Resend dashboard access remains a human browser action.
- Dodo Preview integration uses genuine Test Mode credentials and signed
  webhooks. Dodo dashboard access remains a human browser action. Never infer
  live-provider approval from Test Mode success.
- The Preview-only sensitive `CRON_SECRET` was rotated to a generated
  64-character hexadecimal value, saved only in the owner's password manager,
  configured in Vercel Preview, and successfully deployed. Never request or
  store its value. Vercel Hobby cannot certify the committed sub-daily
  scheduler frequencies; authenticated manual Preview invocation is evidence
  only for the route/worker, not automatic scheduling.
- Docker Desktop/local Supabase was unavailable during the original
  essential-suite boundary, so the Docker-dependent commands were correctly
  recorded as blocked at that time. The owner later made Docker available and
  authorized local closure of those gates. The exact later evidence is recorded
  below; it does not rewrite the earlier result or imply any hosted/production
  action.

## Settled critical staging evidence

- Genuine Dodo Test Mode evidence covers initial ₹499 checkout, success,
  failure, delayed webhook recovery, exactly-once replay behavior, direct
  refund, a confirmed ₹1,000 raise, and an application-controlled two-stage
  ₹1,000 refund submission. The application refund appeared `Pending` in Dodo
  when last inspected; do not submit it again without rechecking provider and
  database state. Provider refunds were subsequently disabled by the owner.
- `Phase 15 Synthetic Studio` remained active, Tech & Apps, ₹1,499, and #1
  after the settled moderation and rejected-change checks.
- Owner Auth SMTP/magic-link delivery, branded rendering, dashboard access,
  one-time link replay rejection, unauthenticated route denial, and cross-owner
  denial passed.
- Human admin enrollment used the verified Supabase user, verified TOTP/AAL2,
  and a direct least-privilege `reviewer` role. No email/domain/metadata-based
  authorization or in-app first-admin bootstrap was used.
- Public report submission remained enumeration-safe, private, and
  non-financial. Reviewer report visibility, suspend/unsuspend, raise denial
  while suspended, unchanged ₹1,499 financial total, public removal/return,
  report resolution, append-only evidence, and private-text non-leakage passed.
- The original transactional-email batch contained seven rows. Database and
  genuine Resend webhook evidence showed 7/7 sent and delivered, zero backlog,
  zero dead-letter, and zero delivery exceptions. The owner visually approved
  first-sponsorship confirmation, confirmed raise, sponsorship adjustment, and
  both moderation-result messages.
- Generic management email passed: v2 template, outbox sent, webhook delivered,
  one attempt, provider reference present, immutable admin audit present,
  visually approved, and a fixed generic `/manage` action with no Auth token.
- Safe-management resend requires listing public ID
  `lst_jezOqvpxzN1ivz5V0KWONOEN`, not URL slug
  `phase-15-synthetic-studio-97c5c73580`. The earlier slug submission failed
  before any email/audit row; the corrected retry passed.
- A synthetic category change from Tech & Apps to Brands & D2C was submitted
  and rejected. Its listing-change-result email passed. The public category,
  total, and rank remained unchanged.
- The proper SVG back arrow was visually confirmed after deployment.

## Risk-based critical-path certification result

- The delayed-verification page now explicitly says not to pay again while the
  payment check is in progress. The existing abandoned Test Mode attempt
  remained hidden. Its v2 email was enqueued once, sent once, and genuinely
  advanced to `delivered`; the owner visually approved the branded message,
  safe wording, fixed protected-Preview status link, and absence of private or
  provider identifiers. A second worker invocation returned zero claimed rows,
  and the database still showed one outbox row and one send attempt.
- The synthetic listing remained active, Tech & Apps, ₹1,499, and #1. Listing
  totals, daily projection, original sponsorship, positive fulfilment
  uniqueness, lifecycle, ledger validity, and reconciliation checks had zero
  discrepancies. There were no negative/restoration/admin-correction ledger
  entries or open reconciliation items.
- The authenticated reconciliation run completed in Dodo `test_mode` with five
  duplicates, zero applied, failed, quarantined, or discrepant items. It did
  not alter the synthetic listing or apply the submitted Test Mode refund.
- Cron authorization denial/success, security headers, Data API denial for
  `app` and `private`, Storage privacy, schema/grant isolation, immutable-table
  triggers, build-secret scanning, and dependency audit passed the critical
  checks. The Supabase security advisor still reports leaked-password
  protection disabled; this is recorded as a warning for the passwordless app,
  not silently treated as a passing advisor matrix. Performance findings were
  informational missing/unused-index notices on the small staging dataset.
- Formatting, lint, typecheck, 203 core tests, the production build, build
  secret verification, and the dependency audit passed. Hosted migration and
  schema equivalents matched the committed ten-migration set and required
  isolation invariants. The formerly blocked local Docker-dependent database,
  performance, and Playwright suites subsequently passed as recorded below.
- Preview `PAYMENTS_ENABLED` was changed to `false`, a fresh successful Preview
  deployment was created, and the stable protected alias was repointed to it.
  The owner then explicitly approved a temporary least-privilege ceremony. The
  sole reviewer was elevated to `super_admin`, used the authenticated AAL2
  application path to set database `payments_enabled=false`, and was
  immediately restored to `reviewer`. Independent verification found exactly
  one application flag audit, one elevation audit, and one restoration audit;
  there are zero active super-admins. `provider_refunds_enabled` remains
  `false`, and Dodo remains in Test Mode.
- The authorized hosted backup completed and the script verified its encrypted
  archive. Independent filesystem verification recomputed the same SHA-256,
  matched the evidence filename, and found zero retained plaintext backup
  directories. Evidence:
  - archive:
    `D:\GoneViral-Backups\20260831T042746Z-fndssapjkaicxzeruuvv.7z`
  - SHA-256 evidence:
    `D:\GoneViral-Backups\20260831T042746Z-fndssapjkaicxzeruuvv.7z.sha256`
  - SHA-256:
    `db72ee6fb77e97f0e56bf5604f82861c79154f6e80080bca82f375a0f7fffd9b`
  - source commit: `682969e41cbfba73bb4b2d81681eb2abd2dbe509`
  - archive last-write UTC: `2026-08-31T04:28:32.4370707Z`
  - passphrase location: approved password manager only; never repository or
    chat.

## Later local deferred-gate closure

Docker Desktop and the required local Supabase services were healthy when this
closure was run. No hosted database, Preview deployment, provider, credential,
domain, payment/refund, or production state was changed.

- `pnpm db:migrations:verify` passed with all 10 committed migrations applied in
  order.
- `node scripts/db/verify-schema.mjs` passed with 26 `app`/`private` tables, six
  categories, 10 immutable/sanitization triggers, no `SECURITY DEFINER`
  functions, and no browser/public access.
- `pnpm db:schema:verify`, `pnpm db:lint`, and `pnpm db:advisors` passed. The
  local Data API did not expose `app` or `private`, and the local database linter
  and advisors reported no issues.
- `pnpm test:database` passed 12 files and 66 tests.
- `pnpm perf:query-plans` passed. Recorded p95 execution times in milliseconds:
  Main 0.100, Today 0.160, category 0.062, owner 0.094, admin 0.113, payment
  0.041, webhook 0.047, email outbox 0.041, reconciliation 0.032, and listing
  ledger 0.057.
- `pnpm test:performance` passed its local synthetic payment/webhook load test
  with zero pool errors.
- The first `pnpm test:e2e` closure run honestly failed: 61 passed, seven
  failed, and nine did not run. It exposed a WebKit pre-hydration controlled
  form-value loss plus an ambiguous status-role test locator. The ordinary join
  fields were returned to browser-owned form state for progressive enhancement,
  and the crop assertion was made exact. A complete WebKit 1440 sequence then
  passed 11/11, followed by a clean full matrix: `pnpm test:e2e` passed 77/77
  across desktop Chromium, 390/320/412 mobile Chromium, 834 tablet WebKit,
  Firefox 1440, and WebKit 1440.
- The exact closure candidate also passed `pnpm format:check`, `pnpm lint`,
  `pnpm typecheck`, `pnpm test` (40 files, 203 tests), `pnpm test:coverage`
  (95.40% statements, 91.51% branches, 97.00% functions, 95.91% lines),
  `pnpm build`, `pnpm security:verify-build` (25 client assets; no public source
  maps or server-secret markers), and `pnpm audit --audit-level=moderate` (no
  known vulnerabilities).

## Isolated backup restore rehearsal: attempted, gate failed

The owner authorized an isolated non-production restore of the encrypted hosted
backup. No hosted Supabase/Vercel/provider service, existing local database, or
production system was used as the restore target.

- The archive SHA-256 was rechecked and matched
  `db72ee6fb77e97f0e56bf5604f82861c79154f6e80080bca82f375a0f7fffd9b`.
  The owner entered the passphrase directly into 7-Zip; it was never sent to
  chat, printed, committed, or stored in a repository file. Extraction reported
  seven folders, 11 files, 352,582 bytes, and `Everything is Ok`.
- All 10 manifest-listed payload files passed their individual SHA-256 checks,
  including three Storage objects. The source identity remained project
  `fndssapjkaicxzeruuvv`, source commit
  `682969e41cbfba73bb4b2d81681eb2abd2dbe509`, and manifest creation time
  `2026-08-31T04:28:20.6556996Z`.
- Restoration used PostgreSQL 17.6 in disposable Docker container
  `goneviral-phase15-restore-20260831`, on Docker internal network
  `goneviral-phase15-restore-internal`. Host access for checks is restricted to
  a disposable TCP proxy on `127.0.0.1:55432`; the target has no production or
  staging connection. The first successful database restore ran from
  `2026-08-31T06:41:01.3787981Z` to `2026-08-31T06:41:03.0052783Z` (1.626
  seconds). An independent certified restore took 19.631 seconds.
- The standalone Supabase PostgreSQL image required a managed
  `supabase_realtime_admin` compatibility role. The archive's `roles.sql` also
  omitted `GRANT goneviral_app TO postgres`, although that grant is present in
  committed migration `20260828144813_phase_2_database_foundation.sql` and in
  the source/local access model. The exact committed grant was applied only to
  the disposable restore container.
- Two independent restores matched across 57 `app`/`private`/`auth`/`storage`
  tables with zero row-count or whole-row fingerprint differences. Aggregate
  restored rows were `app=17`, `private=170`, `auth=17`, and `storage=5`; the
  combined deterministic fingerprint was
  `33b9af62a28d953770d73afbbd5b16a72ae3b0c5fe20f90b5558f052504eb72b`.
  All 209 rows in the 55 tables represented by `COPY` sections matched the dump
  exactly.
- `pnpm db:migrations:verify` passed all 10 committed migrations.
  `node scripts/db/verify-schema.mjs` passed 26 application/private tables, six
  categories, 10 required triggers, no `SECURITY DEFINER` functions, and no
  PUBLIC/browser-role access. Restore-target `db lint` and `db advisors`
  equivalents using the explicit isolated URL both reported no issues.
- Financial/integrity checks passed: five listings and five ledger entries,
  zero listing/ledger or daily-projection mismatches, zero negative totals,
  zero fulfilled-attempt identity mismatches, zero duplicate provider event,
  payment, adjustment, or order identities, zero open reconciliation items,
  zero orphan owner/admin Auth references, zero active super-admins, and both
  payments/refunds flags disabled. Ten attempted append-only/identity/immutable
  mutations were blocked inside rolled-back transactions.
- Storage restoration matched exactly: two bucket metadata rows, three object
  metadata rows, three extracted files, and zero inventory/checksum differences.
  The public logo bucket remained public with a 256 KiB/one-MIME-type policy;
  the staging logo bucket remained private with a 2 MiB/three-MIME-type policy.
- The gate nevertheless **failed** because the backup's managed schema/data dump
  contains the `auth.schema_migrations` and `storage.migrations` table
  definitions but no rows for either table. Both restored counts are zero; the
  same-version local Supabase reference has 77 Auth and 63 Storage migration
  rows. Isolated GoTrue therefore attempted to replay old migrations against
  the already-current restored schema and exited on an incompatible
  `auth.oauth_clients` migration.
- Consequently `pnpm test:database` is not certified on the restore. Its first
  topology attempt passed 44/66 and failed 22/66 because runtime/Auth requests
  still reached the ordinary local services while direct SQL reached the
  restore clone. Creating a coherent isolated Auth service then exposed the
  missing managed migration history above before a valid rerun could begin.
  Twelve matching synthetic Phase 8/10 Auth users may remain in the ordinary
  local Supabase database from that failed split-topology attempt; they were not
  deleted because cleanup was outside the owner's authorization.

The decrypted extraction directory and disposable restore database/proxy remain
local for evidence review. They were not cleaned up because cleanup was not
authorized. Do not treat this as a complete restore rehearsal. Repair the backup
procedure so managed Auth and Storage migration histories and required role
memberships are captured, create a fresh encrypted backup, and repeat the same
isolated rehearsal before closing this gate.

## Exact resume point

The risk-based critical staging path is complete. Preserve the private staging
shutdown: Preview and database payments off, provider refunds off, Dodo Test
Mode, protected alias only, and the sole active admin at `reviewer`. Do not run
destructive prelaunch cleanup unless the owner separately authorizes it and
supplies the exact project-bound confirmation through the runbook. Do not begin
Phase 16 or touch production credentials, domains, or live payments.

The formerly Docker-blocked local database, performance, and automated E2E
gates are resolved. The complete Phase 15 matrix is still not certified. The
isolated restore was attempted and proved the application/financial data and
Storage object payloads restorable, but the gate failed because managed Auth
and Storage migration histories and a required role membership were absent from
the archive. A corrected fresh backup and clean repeat rehearsal are required.

Deferred unless a critical failure makes them necessary: exhaustive manual
visual/browser/device coverage beyond the passed automated seven-project
matrix, manual screen-reader certification, a fresh hosted cropper walkthrough,
every synthetic bounce/complaint/suppression case, destructive load testing,
and provider restoration when genuine safe Dodo evidence is unavailable.

Vercel Hobby automatic sub-daily scheduling and production-specific
configuration also remain unverified. The committed Preview Auth URLs and
staging-hosted email logo must not be reused as production configuration.

## Production boundary

Do not repeat the whole staging suite in production. If production is later
authorized only after the written provider, legal, accounting, infrastructure,
isolation, backup, and security gates pass, run the automated release suite on
the exact release commit and then a minimal non-destructive production smoke
test for production-specific credentials/configuration, DNS/TLS, Auth/email,
webhooks, cron, security isolation, monitoring, rollback, backup, and one
explicitly authorized legitimate founder-owned transaction. No production gate
is currently satisfied merely because private staging works.
