# Phase 15 staging and production-shaped pre-launch current state

Last updated: 2026-09-05 (Asia/Kolkata)

This is a sanitized, non-authoritative certification record for Phase 15 work
on `codex/phase-15-staging`. Read the authority
order and acceptance rules in the specifications and
`PHASE_15_STAGING_CERTIFICATION_AND_LAUNCH.md` before making decisions. Update
this file after material external-state changes. Do not place secret values,
credentials, magic links, MFA material, webhook bodies, card data, recipient
addresses, or backup passphrases here.

## Scope and owner decision

- The owner has authorized a non-commercial, production-shaped Vercel
  Production environment on Hobby at `goneviral.in`, using Dodo Test Mode with
  payments enabled. This is not authorization for Dodo Live Mode, a real
  transaction, refunds, destructive cleanup, Vercel Pro purchase, commercial
  launch, or Phase 16.
- The existing hosted Supabase project `fndssapjkaicxzeruuvv` is intentionally
  the single shared pre-launch Database/Auth/Storage data plane for Preview and
  Production. Do not create another Supabase project. Synthetic Test Mode data
  is expected and must later be removed only through the separately authorized
  safe pre-live cleanup.
- Dodo remains in Test Mode. The Preview remains protected and noindex.
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
- The later Phase 15 evidence series through
  `a7d1206dea4151cad9e996077fea72ce3a8383b1` was also pushed to that same
  origin branch and independently verified with `git ls-remote`; no deployment
  or hosted-service mutation accompanied the push.

## Repository and connected staging services

- Workspace: `C:\coding\goneviral`
- Branch: `codex/phase-15-staging`
- Pre-certification source HEAD and hosted-backup source commit:
  `682969e41cbfba73bb4b2d81681eb2abd2dbe509`
- Stable protected Preview:
  `https://goneviral-phase15-preview-warriorsushis-projects.vercel.app`
- Vercel project ID: `prj_pvt3u8wDLvJ3C4X9QTB7AlHUvL12`
- Vercel scope: `warriorsushis-projects`
- Current deployment behind the stable alias:
  `https://goneviral-8ksj2tbx1-warriorsushis-projects.vercel.app`
- Current deployment ID: `dpl_8bkWCCVgSwqXZEy9LN5fqggbPTcN`
- Current deployed application commit and frozen Preview release candidate:
  `b8298a798efce1195b7c5ad38add60d8a54b2fd1`
- The prior alias target was deployment `dpl_Cri4g8B93gRUsWHokoLGMEe4kDfB`
  from application commit `682969e41cbfba73bb4b2d81681eb2abd2dbe509`.
- The repository is linked and the Vercel CLI is authenticated. Use
  `pnpm.cmd exec vercel ...` from the workspace.
- Hosted shared pre-launch Supabase project: `fndssapjkaicxzeruuvv`, Mumbai.
  The Supabase CLI connection is authenticated to the correct project.
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

The failed-rehearsal extraction and disposable target remained only until the
corrected rehearsal evidence was recorded. They are historical failure evidence,
not the current restore state.

## Corrected isolated backup restore rehearsal: core recovery passed; database suite orchestration incomplete

The remediation in `b4a404743911f72b9a630a42d708214c97272796` added the
intentionally scoped Auth/Storage migration-history export and the one required
custom-role membership. The owner then authorized a new encrypted backup and a
new disposable local restore target. No hosted staging, provider, production,
credential, domain, or payment/refund state was changed.

- The fresh archive
  `D:\GoneViral-Backups\20260831T074328Z-fndssapjkaicxzeruuvv.7z`
  passed encrypted-archive and per-file verification: 14 files, 363,130
  plaintext bytes, archive SHA-256
  `fac5c0149101cec6e96f2bfc8e07b274ff58037bd67762dce76a58f53d3569c9`.
  The owner entered its passphrase directly into 7-Zip; it was never printed,
  stored, committed, or sent to chat. Its format-v2 manifest records project
  `fndssapjkaicxzeruuvv`, source commit
  `b202e05263ca1f7afd52b923ef525fc9f5bcc99d`, PostgreSQL image
  `public.ecr.aws/supabase/postgres:17.6.1.166`, 77 Auth and 65 Storage
  migration-history rows, the sole `goneviral_app -> postgres` membership, and
  three Storage objects.
- The restore used a newly initialized, locally isolated Supabase target named
  `goneviral_phase15_restore_20260831`, separate ports, its own Docker network,
  and the manifest's PostgreSQL image. The exact final database restore ran from
  `2026-08-31T08:29:12.3151844Z` to `2026-08-31T08:29:17.4049194Z` (5.090
  seconds). It restored roles, the scoped membership, Auth/Storage and
  application schemas/data, managed histories, and application history in
  dependency order with stop-on-error; it never targeted the linked staging or
  ordinary local-development database.
- Source versus restored `COPY` payloads matched byte-for-byte after normalized
  deterministic extraction: `app-private-data.sql`
  `0a8805dc5f37896539fea1cf7a2ca28585b85b316d03b4b13e606477fc4ff96f`,
  `auth-storage-data.sql`
  `62e58180322d7e1be9d77e8919e24028f89702479abac52dd36c372317726b61`,
  `migration-history-data.sql`
  `13826b7f589cfbe198bdba516ef4cd7b93cb8bd7ae157ed9e0898ada8adce10a`,
  and `managed-migration-history.sql`
  `455fbffd21632cd0c05cc9030547cb2ebf76187ac689da6dde8214cfe855f68d`.
  Final restored row counts were five listings, five ledger entries, one Auth
  user/identity, two Storage buckets, and three Storage objects.
- Auth and Storage both became healthy after the clean final restore with zero
  migration-error signatures; the restored history counts were exactly 77 and 65. Auth and Storage health endpoints returned HTTP 200. All three archived
  Storage objects were retrieved through the isolated Storage service with exact
  SHA-256 matches. The two buckets retained the expected public/private,
  size-limit, and MIME-type policies.
- `pnpm db:migrations:verify`, `node scripts/db/verify-schema.mjs`, isolated
  target `db lint`, and isolated target `db advisors` all passed. Data API
  checks returned `406/PGRST106` for both `app` and `private`, and `404` for
  `public.categories`.
- Financial, projection, timing, identity, role, and trigger checks passed:
  zero listing/ledger and daily-projection mismatches; zero negative totals,
  fulfilled-attempt identity mismatches, duplicate provider identities, open
  reconciliation items, or orphan Auth references; zero active super-admins;
  the exact custom membership was present; payments and provider refunds were
  both restored as disabled; and all ten required mutation triggers were
  enabled. Nine representative update/delete probes were blocked in rollback
  subtransactions, including the immutable ledger, provider identities,
  payment-intent fields, listing sponsorship, ready-logo payload, audit,
  moderation, and refund-request protections.
- `pnpm test:database` is **not certified for the exact restored snapshot**.
  A fully routed isolated attempt passed 56/66 tests; its remaining ten mock
  checkout/webhook tests were correctly rejected because the restored staging
  `payments_enabled` flag is `false`. No provider call occurred. The ordinary
  local ports were restored immediately afterward. This exposed a rehearsal
  orchestration gap, not a need to enable hosted or live payments: on a new
  disposable target, snapshot the exact operational-flag rows, temporarily set
  only isolated `payments_enabled=true` while the suite is forced to mock
  providers/executors with no live credential, permit the suite's own isolated
  refund-flag exercise, and restore the exact rows in a `finally` step. Then
  verify both flags are disabled and rerun the complete 66-test suite.
- The prior split-topology attempt created 12 synthetic Auth users only in the
  ordinary local development database: seven `phase8-*` and five `phase10-*`,
  all created between `2026-08-31T06:48:12Z` and `2026-08-31T06:48:18Z`. They
  had zero application, admin, financial, audit, moderation, or refund
  references and were deleted there only; staging and production were not
  touched.
- After this evidence was recorded, all identified restore-rehearsal containers,
  networks, volumes, plaintext extraction directories, and the disposable stack
  directory were removed. A final inventory found none remaining. The encrypted
  archive and its `.sha256` evidence file remain intact; the ordinary local
  database, pooler, and router were restored healthy.

## Final isolated restore and database-suite certification: passed

The owner started Docker and authorized a new isolated rehearsal of the same
verified corrected archive. Implementation commit
`0ba836151c1ae2d9dba31bd2ec57a2decef0fcf2` hardened the test orchestration and
restore procedure; it is intentionally separate from this evidence update.

- The owner entered the archive passphrase only in 7-Zip. Extraction to
  `D:\GoneViral-Restore-Rehearsal\20260902T103018Z-fndssapjkaicxzeruuvv`
  produced 14 files and 363,130 bytes. Independent manifest-v2, archive
  SHA-256, per-file SHA-256, source identity, image, managed-history,
  membership, and Storage-object checks all passed. The passphrase was not
  printed, logged, committed, or sent to chat.
- The new target
  `D:\GoneViral-Restore-Rehearsal\20260902T103018Z-stack` used distinct
  loopback ports `55321`/`55322`/`55329`, isolated Docker resources, and exact
  image `public.ecr.aws/supabase/postgres:17.6.1.166`. No staging, production,
  or ordinary local-development database was targeted. The successful clean
  restore ran from `2026-09-02T10:42:12.7985461Z` through
  `2026-09-02T10:42:13.4901387Z` (0.686 seconds), with stop-on-error and the
  disposable `postgres` role immediately returned to `NOSUPERUSER`.
- Auth and Storage started healthy without historical migration replay:
  health endpoints returned HTTP 200, their logs contained zero migration-error
  signatures, and histories were exactly Auth 77, Storage 65, and application 10. Final counts were five listings, five ledger entries, one Auth user and
  identity, two Storage buckets, and three Storage objects.
- The local Storage file backend required its configured `stub/stub` tenant and
  project namespace before `<bucket>/<key>/<version>`; the earlier direct-under-
  `/mnt` assumption was wrong. After correcting only the disposable volume,
  all three objects returned HTTP 200 through Storage with exact SHA-256 values
  `13cfce5cb75fb783f6bb433475c7259e20420086e497093ff20dc29c4be0aa89`,
  `41a3a431e35d6bb54d042e8e694be67d83ef14d491d006338b285bd5fa7d834f`,
  and `51c44b0a59e61b971006023c2e99fbdea2f56a0494af4ccb94eb72dbcde3a3ff`.
- Post-test source-versus-target normalized `COPY` payloads matched exactly:
  `app-private-data.sql`
  `0a8805dc5f37896539fea1cf7a2ca28585b85b316d03b4b13e606477fc4ff96f`,
  `auth-storage-data.sql`
  `62e58180322d7e1be9d77e8919e24028f89702479abac52dd36c372317726b61`,
  application history
  `13826b7f589cfbe198bdba516ef4cd7b93cb8bd7ae157ed9e0898ada8adce10a`,
  and managed history
  `455fbffd21632cd0c05cc9030547cb2ebf76187ac689da6dde8214cfe855f68d`.
- `pnpm db:migrations:verify`, `node scripts/db/verify-schema.mjs`, isolated
  `db lint`, and isolated `db advisors` passed. Data API denial remained
  `406/PGRST106` for `app` and `private`, with `404` for
  `public.categories`. All financial, ledger, daily/lifetime projection,
  timing, fulfilled-attempt identity, duplicate-provider-identity,
  reconciliation, orphan-Auth-reference, active-super-admin, role-membership,
  trigger, and shutdown-flag failure counts were zero. Both bucket policies
  matched, all 12 application/private custom triggers were enabled, and nine
  representative forbidden updates/deletes were blocked inside a rolled-back
  transaction.
- The earlier wrapper was too narrow: the integration fixture lifecycle
  replaces broad local-test data, so restoring only operational flags would
  destroy the certified source snapshot. The final wrapper snapshots all five
  restored schemas inside the disposable database container, fingerprints
  data and sequence state, removes live-provider credentials, forces mock-only
  execution, quiesces only disposable writers in `finally`, restores the full
  snapshot, verifies exact disabled flags and managed histories, and deletes
  its temporary dump.
- Final verification passed `pnpm format:check`, `pnpm lint`, and
  `pnpm typecheck`. The guarded database run then passed 12/12 files and 66/66
  tests in 23.21 seconds and recovered the complete pre-test payload exactly.
  No provider transaction or hosted payment/refund state change occurred.

- Cleanup removed only this rehearsal's plaintext extraction, comparison files,
  containers, network, volumes, and stack directory. Final inventory was
  containers 0, volumes 0, networks 0, and directories 0. The temporary
  in-container test snapshot was absent before shutdown. The encrypted archive
  and `.sha256` evidence remain present; the archive still matches SHA-256
  `fac5c0149101cec6e96f2bfc8e07b274ff58037bd67762dce76a58f53d3569c9`.
  Ordinary local Supabase remained available on expected API/database ports
  54321/54322.

## Exact resume point

### GitHub scheduler and public-repository audit

The owner reported making `WarriorSushi/GoneViral` public before this
continuation. Read-only GitHub verification confirmed public visibility and
that `codex/phase-15-staging` is the default branch. Codex did not change
visibility.

Commit `3b6e8a8327ecadbf1242b2ba8114d7a228e1c9d1` implements the initial
GitHub Actions scheduler with three UTC schedules plus fixed manual choices.
It calls the five existing authenticated routes through a checked-in Node
runner, grants `contents: read`, pins Actions to full SHAs, has one concurrency
group, requires origin-only HTTPS, bounds connection/total time, fails on
non-2xx, and logs only fixed route/status/timing. Both workflow and runner
require repository variable `GONEVIRAL_SCHEDULED_OPERATIONS_ENABLED` to equal
exact lowercase `true`; it was absent at verification, so the scheduler is
inert. No hosted route, secret, variable, deployment, or provider was changed.

Protected Vercel Preview support is implemented in
`a6bc5289a7a0b9dd9222ae6ba9bc332d81b30109`. The workflow reads
`VERCEL_AUTOMATION_BYPASS_SECRET` only from GitHub Actions secrets. The runner
requires it after the exact enable guard, sends it only in the
`x-vercel-protection-bypass` header, keeps both credentials out of the command,
URL, response handling, and logs, and fails closed before a request when the
bypass value is absent. No secret value was created, read, printed, or stored.
Read-only GitHub checks before and after the push showed zero Actions secrets,
zero repository variables, and zero scheduled-workflow runs, so the hosted
scheduler remained disabled throughout implementation and publication.

Local verification for that patch passed `pnpm test:scheduled-operations` (one
file, 9 tests), `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, and
`pnpm test` (41 files, 212 tests). These are implementation/static results, not
hosted schedule evidence.

The complete public-content audit passed without a credential exposure or
ambiguous sensitive artifact:

- all fetched public branches, local publishable refs, tags, current tree, and
  the broader `git --all` reachable set were inspected; that set contained 40
  commits, 1,454 object/path records, no tags, and no blob over 1 MiB;
- official Gitleaks 8.30.1 was downloaded outside the repository and verified
  against its published checksum, then scanned all reachable history with full
  redaction. Its six generic-key candidates were individually confirmed as
  deterministic literals in test files, with no recognized provider token,
  private key, JWT, magic link, or real database credential;
- custom path/content checks found no tracked backup/archive, `.env`, private
  key, customer/provider payload, credentialed remote database URL, or private
  evidence. Database URL candidates were loopback/placeholders or a reserved
  `.example` fixture. Numeric/card-shaped candidates were schema identifiers,
  timestamps, binary bytes, or deterministic test fixtures. The non-reserved
  Gmail address was the intentionally public legal contact;
- all three distinct historical workflow versions used complete Action SHAs,
  none used `pull_request_target`, and the only pull-request workflow secret
  reference was GitHub's generated read-only `GITHUB_TOKEN`. The scheduler's
  `CRON_SECRET` is reachable only from schedule/manual events after the guard;
- the worktree had zero non-ignored untracked files. `.vercel`, build/test
  output, dependencies, and Supabase CLI state were confirmed ignored and
  untracked without inspecting or publishing their contents. The full Git
  object integrity check passed.

The original audit showed secret scanning and push protection disabled. The
post-patch read-only check now shows both enabled. Actions secrets and repository
variables were subsequently configured by the owner. Read-only listing verified
only expected names: Actions secrets `CRON_SECRET` and
`VERCEL_AUTOMATION_BYPASS_SECRET`, plus repository variable
`GONEVIRAL_SCHEDULED_OPERATIONS_BASE_URL`. No secret value was disclosed or
read. The enable variable was initially absent; its later authorized activation
and route evidence are recorded below.

Repository hardening is now complete. Default workflow permission remains
`read`, and workflows cannot approve pull requests. Actions are restricted to
GitHub-owned Actions plus `pnpm/action-setup` and
`gitleaks/gitleaks-action`; verified-creator wildcard access is off and full-SHA
pinning is repository-enforced. Active ruleset `Protect default branch` (ID
`22121900`) follows `~DEFAULT_BRANCH` with no bypass actors. It blocks deletion
and force pushes, requires linear history, and permits only squash merges after
a pull request whose review threads are resolved and whose strict `quality`
check comes from GitHub Actions app ID `15368`. Required approvals are zero to
preserve a workable solo-owner flow while retaining the PR and CI audit trail.

The hardening evidence was submitted through public pull request `#2` to prove
the new rules. Its first `quality` run failed honestly at typecheck because a
fresh runner did not yet have Next.js-generated global `PageProps` route types;
local development/build state had masked that prerequisite. Following the
installed Next.js 16.3.3 documentation, `package.json` now runs `next typegen`
before `tsc --noEmit`. Local formatting, lint, corrected typecheck, and 212/212
tests passed. GitHub Actions run `33649828937` then passed the complete required
`quality` job, including install, formatting, lint, typecheck, unit tests,
production build, client-build secret/source-map verification, dependency
audit, and Gitleaks. This is repository/CI evidence, not hosted scheduler
evidence.

Vercel's automatic pull-request integration emitted a separate failed
`Deployment failed` check. It is not required by the ruleset; no Vercel deploy
command or hosted cron request was run by Codex. The failed external check is
not represented as a successful Preview deployment.

The scheduler activation gate and exact sanitized evidence are documented in
`GITHUB_SCHEDULED_OPERATIONS.md`. Following explicit owner authorization on
2026-09-02, Codex created the exact lowercase enable variable. Each manual
protected-Preview operation succeeded independently: email outbox drain run
`33651848820`, operational health run `33651935090`, payment reconciliation run
`33652002634`, logo cleanup run `33652063724`, and retention cleanup run
`33652118316` all returned HTTP 200. Inspected output contained only fixed route,
status, and duration. No response body or credential was printed or stored.

The operational-health result was successful execution with attention needed,
not an all-clear. Sentry emitted Preview warning
`operational_alert:payment_attempt_stale` at 15:58:13 UTC from the known Preview
release immediately after manual health run `33651935090`. The code condition
means at least one nonterminal payment attempt was more than 30 minutes old.

At 17:46 UTC on 2026-09-02, a read-only aggregate query against the verified
healthy `goneviral` Supabase project found exactly one matching attempt. It was
a Dodo `test_mode` `initial_sponsorship` attempt in `checkout_ready`, about 77
hours old, with an already-expired checkout window. It had a provider order and
checkout-session reference, as expected for a created checkout, but no provider
event, provider payment, fulfilled ledger entry, success timestamp, failure or
quarantine marker, or open/investigating reconciliation item. No identifiers,
customer data, provider references, amounts, payloads, or credentials were
returned or recorded, and no database or provider state was changed. This is
consistent with an abandoned staging checkout rather than a charge, lost
payment, or route failure. Its nonterminal state can continue to trigger the
health warning until the application applies an approved lifecycle transition;
do not perform an ad hoc database repair.

A separate bounded credential-free Preview request returned HTTP 302 without
following the redirect or printing a body, confirming Vercel Deployment
Protection denial. GitHub created no automatic `schedule` event from 16:00
through 16:23:43 UTC despite the workflow file being present on the default
branch and API state `active`. Codex refreshed the registration through the
supported disable/enable API at 16:11 UTC; no event appeared during the remaining
window. This is unresolved automatic-cadence evidence, not a route failure.
Five-minute, hourly, daily, duplicate/catch-up, failure-notification,
stale/missing-run, and 60-day-disablement certification remain open.

A follow-up diagnostic verified the active workflow metadata, non-fork public
repository state, exact default-branch file, matching local/remote content hash,
all three cron definitions, and direct Actions API run history. Workflow ID
`348420162` had five successful manual events and zero scheduled events. The
prior disable/enable cycle did not repair delivery. Pull request `#4` therefore
made the smallest supported schedule-metadata refresh: add explicit
`timezone: "Etc/UTC"` to the three already-UTC schedules while leaving every
cron string and all job logic/configuration unchanged. Focused tests passed 9/9
and required CI run `33655967625` passed. The PR squash-merged as
`fcaf1a206c9f046f900eefd04e1988ba7c93ca3d`; local, tracking, and remote refs
matched. One bounded post-merge check at 16:41:45 UTC still showed `active` and
zero schedule events. GitHub Status showed no Actions incident. GitHub exposes
no deeper registration state, so the exact provider-side cause is not
identifiable and automatic cadence remains uncertified.

The owner declined a GitHub Support case and authorized a temporary isolated
canary. Pull request `#6` added a five-minute offset schedule that uses empty
permissions, no Actions, no repository checkout, no credentials/configuration,
and no network request; it prints only event name and UTC time. The canary and
existing scheduler tests passed 10/10, required CI run `33660917458` passed, and
the PR squash-merged as `cf7e991bcbd0cc97b0069ecfe2124bd07fd365b7`.
Canary workflow ID `348634880` was active, and manual run `33661199927` passed
in three seconds. GitHub created no event for its first fair 17:32 UTC scheduled
slot by the single 17:35:41 UTC query; both the canary and production scheduler
reported zero schedule events at that time. This isolates the observed failure
from GoneViral routes, secrets, variables, Vercel, and scheduler job logic.

A later bounded check again found both workflow registrations active and zero
scheduled events in both histories. On 2026-09-02 the owner ended further
GitHub scheduled-event debugging and selected Cloudflare Workers Cron for
private staging. Codex manually disabled workflow IDs `348420162` and
`348634880`, deleted only repository variable
`GONEVIRAL_SCHEDULED_OPERATIONS_ENABLED`, and verified both API states were
`disabled_manually`. The two GitHub secrets and non-secret base-URL variable
were not read, changed, or deleted. The repository change removes the canary
and its test and strips the main workflow's automatic `schedule` trigger while
retaining its guarded manual-recovery definition and historical evidence. No
hosted route was invoked by these shutdown actions.

The replacement proposal is in `CLOUDFLARE_SCHEDULED_OPERATIONS.md`: one
dependency-free scheduled-only Worker, three UTC triggers, fixed route mapping,
Cloudflare secrets for `CRON_SECRET` and the protected-Preview automation
bypass, a disabled-by-default guard, bounded requests, redirect rejection, and
safe logs. No Cloudflare account setting, Worker, trigger, variable, secret,
deployment, or request has been created or executed.

The owner subsequently confirmed Workers Free and at least three unused
account-wide Cron Trigger slots. Local implementation adds the scheduled-only
Worker, exact three-trigger configuration, full-sampling observability,
origin-only HTTPS validation, two secret-only headers, 45-second abort,
redirect/non-2xx/network failure handling, concurrent complete route attempts,
and credential/body-safe logs. Wrangler is pinned and its required `workerd`
build is narrowly allowlisted by the repository supply-chain policy. The
checked-in enable binding remains exact lowercase `false`; the bundle passed a
local Wrangler dry run and no Cloudflare login, account binding, secret,
trigger, deployment, or hosted GoneViral request occurred.

The inert Worker and abandoned-checkout expiry implementation squash-merged
through protected pull request `#10` as
`fd7a59bd44e167633bb877e5b2837c00ac200e2b`. Local verification passed the Worker-focused
suite (8/8), lifecycle/health unit selection (5/5), checkout/webhook integration
selection (14/14), full unit suite (43 files, 223 tests), full local database
suite (12 files, 67 tests), retired-workflow safety suite (10/10), formatting,
lint, typecheck, production build, client-build leak scan (25 assets), and
dependency audit (no known vulnerabilities). Wrangler `4.128.0` dry-run
bundled 4.90 KiB and listed only the base URL and guard as non-secret bindings.
These are local implementation results, not Cloudflare deployment or cadence
evidence.

Protected pull request `#10` passed required CI run `33669954613` on its primary
implementation/documentation head and final required CI run `33670289167` on
exact head `1a79d196b1a54a6df0aba307ebeeefcf13bc64da`: dependency installation,
formatting, lint, typecheck, 43-file unit suite, production build, 25-asset client
leak scan, moderate dependency audit, and Gitleaks all passed. The
separate Vercel deployment check failed as expected and is not required; no
deployment was requested or represented as successful.

The abandoned-checkout lifecycle gap is fixed and verified in protected
Preview. Before the
authenticated operational-health route collects metrics, an atomic count-only
operation changes only elapsed `checkout_ready`, `customer_returned`, and
`provider_pending` attempts to local `expired`. It is idempotent, leaves
pre-checkout stalls visible for investigation, does not claim provider failure,
and preserves the tested rule that authentic late provider success supersedes
local expiry. The hosted verification and release-candidate evidence are
recorded below.

The owner's first inert Cloudflare deployment attempt was rejected before
Worker creation with Cloudflare error `10021` because compatibility date
`2026-09-03` was still in the future under Cloudflare's 2026-09-02 UTC date.
No Worker logic, cron, secret, guard, Preview URL, or hosted configuration was
changed. The configuration is corrected to the pinned non-future date
`2026-09-02`; focused tests and a local Wrangler dry run passed. Required CI
run `33673402370` passed, and protected pull request `#12` squash-merged as
`8d76e62f79cc631c3a2d3997ffe2b82be1d45f11` before the successful owner rerun
recorded below.

On 2026-09-03 the owner reported that the corrected inert deployment succeeded,
exactly three Cron Triggers exist, the
`GONEVIRAL_SCHEDULED_OPERATIONS_ENABLED` binding remains exact lowercase
`false`, and both required Worker secret names are present. Their values were
not provided or read. This completes the inert hosted setup boundary only: the
disabled guard prevents GoneViral route invocation, so no automatic cadence,
route result, or failure/staleness evidence is claimed.

The owner explicitly authorized the reviewed Cloudflare staging scheduler
activation on 2026-09-03. The activation diff changed only the checked-in guard
from exact lowercase `false` to `true` and updated its focused static assertion.
Local Worker tests passed 8/8; the guard-true Wrangler dry run bundled 4.96 KiB
(gzip 1.55 KiB); formatting, lint, typecheck, and the full 43-file/223-test unit
suite passed. Required CI run `33676704557` passed, and protected pull request
`#14` squash-merged as `e813fb6de43ea9b4979bc8f7abefa9d485dab787`.
No secret value was accessed or printed. The repository change did not deploy
the Worker or invoke a hosted route; the hosted guard remains on its prior
inert value until the owner deploys the exact merged version.

The owner then reported that the activated Worker deployment succeeded and the
Cloudflare dashboard shows `GONEVIRAL_SCHEDULED_OPERATIONS_ENABLED` as exact
lowercase `true`. No secret value or raw deployment output was provided. This
confirms activation state only; no automatic trigger, route result, or cadence
outcome is fabricated. Using the reported deployment window, the first fair
post-propagation slots are 2026-09-02 20:30 UTC for the five-minute trigger,
2026-09-02 21:17 UTC for the hourly trigger, and 2026-09-03 02:43 UTC for the
daily trigger.

On 2026-09-04 the owner reported partial automatic cadence evidence from a
bounded observed log window. The five-minute trigger fired repeatedly;
`drain-email-outbox` and `check-operational-health` each returned `200 / ok`.
The hourly trigger fired and `reconcile-payments` returned `200 / ok`. No errors
were visible in the observed window. The daily `43 2 * * *` trigger had not yet
reached its next scheduled time, so daily evidence remains pending rather than
failed. No raw logs or secret values were provided. Per owner direction, do not
change or redeploy the scheduler and do not wait or poll for the daily event;
continue other Phase 15 work and add sanitized daily evidence separately after
it occurs.

## Frozen Preview candidate and abandoned-checkout verification

On 2026-09-04, read-only Vercel inspection resolved the stable protected alias
to READY Preview deployment `dpl_Cri4g8B93gRUsWHokoLGMEe4kDfB`, whose Vercel
metadata identified application commit
`682969e41cbfba73bb4b2d81681eb2abd2dbe509`. That commit predates lifecycle-fix
merge `fd7a59bd44e167633bb877e5b2837c00ac200e2b`, so the served Preview did not
contain the fix.

The owner's continuation instruction authorized the single required
Preview-only update. `pnpm ops:deploy:preview` deployed exact clean commit
`b8298a798efce1195b7c5ad38add60d8a54b2fd1` using `vercel.preview.json`. Vercel
reported READY deployment `dpl_8bkWCCVgSwqXZEy9LN5fqggbPTcN` at
`https://goneviral-8ksj2tbx1-warriorsushis-projects.vercel.app`; authenticated
API inspection confirmed Preview resolution, Mumbai functions, Hobby plan,
the exact commit metadata, and zero Vercel crons. A credential-free health
request received the expected Vercel protection redirect. The existing stable
protected alias was then repointed only to that deployment, and a second
read-only resolution confirmed the new deployment ID and Preview target.
Production was not deployed, promoted, aliased, or otherwise changed.

At the next normal five-minute Cloudflare event, the Worker used its existing
authenticated route path against the stable alias. Vercel runtime evidence at
`2026-09-03T20:35:14.095Z` recorded fixed event
`operational_health_checked`, `expiredAbandonedAttempts=1`, and `alertCount=0`
on deployment `dpl_8bkWCCVgSwqXZEy9LN5fqggbPTcN`. Independent aggregate-only
Supabase queries found zero elapsed checkout-bearing nonterminal attempts and
exactly one newly expired attempt. That attempt still had its expected provider
order but had zero provider events, provider payments, fulfilment, success
timestamp, financial-ledger entries, or open/investigating reconciliation
items. No hosted row was edited manually and no provider action was taken.

Application commit `b8298a798efce1195b7c5ad38add60d8a54b2fd1` is now the
frozen Preview release candidate. Its exact Git tree matched required CI run
`33798001313`, which passed install, format, lint, typecheck, unit, production
build, client-leak, dependency-audit, and Gitleaks checks. The final local
release matrix also passed on the exact commit: formatting; lint; generated-
route typecheck; 43 files/223 unit tests; coverage at 95.40% statements, 91.51%
branches, 97.00% functions, and 95.91% lines; 12 files/67 database tests; query
plans; the synthetic performance test; production build; 25-asset client leak
scan; 10 migrations; schema and Data API isolation; database lint/advisors;
dependency audit; and 77/77 Playwright tests across the seven configured
projects. The first database command could not connect because the ordinary
local Supabase stack was stopped; Docker Desktop and only the local stack were
started, and the complete affected gate then passed. No hosted database was a
test target.

The Phase 15 production-readiness decision remains **no-go**. The application
candidate and lifecycle behavior are ready, but commercial hosting,
production-isolation/configuration, the complete public principal address,
provider-live configuration, invoice/payout/accounting evidence, alerting, and
explicit Production/live-action gates are not complete. Optional exhaustive
visual/accessibility and edge-case sweeps remain deferred and are not launch
blockers unless a new failure makes one relevant.

Implementation commit `3b6e8a8327ecadbf1242b2ba8114d7a228e1c9d1` and
documentation/evidence commit `b161f55bf952360e551085b5e630a9cb8e328656`
were pushed together to the existing origin branch. Local, tracking, and
independently queried remote refs matched the latter commit. GitHub registered
the workflow as active, but repository secret and variable counts remained
zero and the scheduler run list was empty immediately after the push. The
guard therefore remained disabled and no hosted route was invoked.

Protected-Preview implementation commit
`a6bc5289a7a0b9dd9222ae6ba9bc332d81b30109` and its documentation/evidence
commit `aaacf4b8715a0d6255f394e2a8788dfbf72b690a` were subsequently pushed to
the same origin branch. Before this push-evidence-only update, local, tracking,
and independently queried remote refs matched the documentation commit. The
remote workflow contained the expected GitHub-secret binding; no hosted secret,
variable, run, deployment, provider action, or route invocation occurred.

The risk-based critical staging path is complete. Preserve the private staging
shutdown: Preview and database payments off, provider refunds off, Dodo Test
Mode, protected alias only, and the sole active admin at `reviewer`. Do not run
destructive prelaunch cleanup unless the owner separately authorizes it and
supplies the exact project-bound confirmation through the runbook. Do not begin
Phase 16 or touch production credentials, domains, or live payments.

The formerly Docker-blocked local database, performance, automated E2E, core
isolated backup-restore, and restored-snapshot 66-test gates are resolved. The
complete Phase 15 matrix is still not certified.

Deferred unless a critical failure makes them necessary: exhaustive manual
visual/browser/device coverage beyond the passed automated seven-project
matrix, manual screen-reader certification, a fresh hosted cropper walkthrough,
every synthetic bounce/complaint/suppression case, destructive load testing,
and provider restoration when genuine safe Dodo evidence is unavailable.

Vercel Hobby automatic sub-daily scheduling is conclusively blocked by the
current plan as recorded below; production-specific configuration remains
unverified. The committed Preview Auth URLs and staging-hosted email logo must
not be reused as production configuration.
An actual hosted isolated restore/PITR rehearsal also remains deferred; this
local isolated logical restore is not evidence for hosted retention, RPO, RTO,
or provider-operated recovery.

## Vercel automatic sub-daily cron certification: blocked by current plan

This gate was re-evaluated read-only on 2026-09-02 after the isolated restore
closure. No deployment, project setting, environment variable, billing state,
schedule, or hosted service was changed.

- The linked project remains `goneviral`, project
  `prj_pvt3u8wDLvJ3C4X9QTB7AlHUvL12`, under team
  `warriorsushis-projects`. An authenticated read-only Vercel API query reported
  `billing.plan=hobby`.
- Current official Vercel documentation allows up to 100 cron entries per
  project on all plans, but Hobby schedules may run only once per day;
  expressions that run more frequently fail deployment. Hobby daily invocation
  timing is also imprecise within the selected hour. This supersedes the old
  two-job count but does not remove the cadence blocker.
- At the time of this read-only check, `vercel.json` had five authenticated
  jobs. Daily logo cleanup and retention
  cleanup meet Hobby frequency syntax. Hourly payment reconciliation,
  every-minute email outbox draining, and five-minute operational health checks
  do not. Weakening those safety cadences would contradict the operational
  specification and is not an acceptable certification workaround.
- Vercel Cron is registered from production deployments, not Preview
  deployments. The authorized protected staging deployment uses
  `vercel.preview.json`, which deliberately omits cron schedules. Prior
  authenticated manual Preview invocations prove the routes and workers, not
  automatic scheduling.
- Therefore Vercel Cron is conclusively **blocked**, not merely untested, while
  the linked team remains Hobby and only Preview deployment is authorized. The
  owner selected Cloudflare Workers Cron instead for private staging. No Vercel
  purchase or production deployment is required or authorized at this stage.

The later 2026-09-04 owner topology decision selects Cloudflare as the only
Production scheduler. The new launch candidate removes the unused Vercel cron
definitions while keeping the Mumbai function region. This changes no deployed
scheduler or hosted service.

## Owner budget-constrained production decision and next gate

On 2026-09-02 the owner deferred the production hosting and plan selection until
immediately before commercial launch and explicitly declined purchasing or
requiring Vercel Pro during private staging. The owner selected Supabase Free
initially and accepts it without managed PITR, including weaker provider
recovery, possible inactivity pause, self-managed backup dependence, and
possible recovery downtime.

This decision does not invalidate the passed logical restore evidence and does
not require another restore. The corrected encrypted backup remains the
baseline Free-plan recovery mechanism. It is not evidence of managed PITR or a
no-data-loss guarantee.

The public-repository audit passed. The owner retired GitHub Actions automatic
scheduling after its application workflow and isolated canary both received
zero scheduled events, and selected Cloudflare Workers Cron for staging. Email
and health remain every five minutes, reconciliation hourly, and cleanup daily.
Durable/idempotent workers catch up after a missed run. Secrets must remain only
in approved provider secret stores. The owner's VPS is reserved for OTTR.

Vercel Hobby remains private-preview-only. Its published terms prohibit
commercial use and explicitly include requesting or processing payments, so an
external scheduler alone cannot make it a valid production host. The owner
selected Vercel plus Supabase for Production. Vercel Pro is required immediately
before commercial launch, when its cost, rollback/pause, notification, and
residual billing risks must be verified.

The exact evidence, limits, schedules, sequential remaining Phase 15 work, and
measured paid-upgrade triggers are recorded in
`PHASE_15_BUDGET_CONSTRAINED_LAUNCH_PLAN.md`. The public-repository audit,
manual protected-Preview route certification, Cloudflare design/implementation,
and inert hosted setup are complete. The activation change is authorized,
merged, and deployed by owner report; five-minute, hourly, and daily automatic
cadence passed. Failure-notification delivery and independent owner-visible
stale/missing-run detection remain pending while other Phase 15 work continues.
Commercial launch, Dodo Live Mode credentials/payments/refunds, prelaunch
cleanup, and Phase 16 still require their existing separate authorizations.

## Production boundary

Do not repeat the whole staging suite in Production. If Production is later
authorized only after the current provider, owner-approved legal/accounting,
infrastructure, isolation, backup, and security gates pass, run the automated
release suite on the exact release commit and then a minimal non-destructive
Production smoke test for production-specific credentials/configuration,
DNS/TLS, Auth/email,
webhooks, cron, security isolation, monitoring, rollback, backup, and one
explicitly authorized legitimate founder-owned transaction. No production gate
is currently satisfied merely because private staging works.

## 2026-09-04 owner launch decisions and legal/configuration audit

The owner confirmed Dodo merchant/KYC/business/bank/live capability and the
GoneViral brand are configured for the sponsored-listing model. The former
generic written-model-approval and merchant-setup blockers are closed by this
owner attestation unless Dodo requests a separate artifact. This is not a claim
of GoneViral-specific written approval or future provider state. Dodo remains in
Test Mode in Preview; no live credential, transaction, refund, or provider
setting was accessed or changed.

The owner also selected Vercel plus Supabase for Production, Cloudflare as the
only scheduler, and owner-drafted legal/tax treatment without indefinite lawyer
or CA approval gates. Vercel Pro is required immediately before commercial
Production because current Vercel terms restrict Hobby to non-commercial use;
it is not required for staging. No purchase, Production deployment, domain,
scheduler, or hosted environment was changed.

The code/configuration audit found genuine launch-critical changes: remove the
unused Vercel cron definitions to prevent a second Production scheduler; update
the public refund rule and paid-placement/model disclosures; accurately explain
Dodo's merchant-of-record, tax, invoice, and data role; correct stale
how-it-works copy; and snapshot new checkout acceptances at policy version
`2026-09-04-v2`. Historical acceptances and in-flight attempts retain their
stored versions and no financial history is reinterpreted. The owner has since
authorized a privacy-minimized geographic address for the final public Contact/
operator disclosure. Omitted premise-level residential details remain
prohibited and were not inferred, reconstructed, or committed.

Launch-critical implementation commit
`0809cc5851320f42862bd4cef64cf8bbd74d9e49` passed the two affected Vitest
files (18 tests), the focused public-board Playwright file (11 tests), Prettier,
ESLint, and TypeScript checking. The single required final CI suite remains
deferred until the complete launch-critical policy/address candidate is ready,
so it runs only once at the actual final release-candidate boundary. The
protected Preview remains the previously certified application
commit `b8298a798efce1195b7c5ad38add60d8a54b2fd1`; it was not redeployed and no
provider or hosted state changed during this audit.

The ordered remaining preparation, authorization boundaries, exact Production
configuration inventory, genuine blockers, owner/provider/accounting gates,
and optional deferrals are in `PHASE_15_PRODUCTION_LAUNCH_CHECKLIST.md`.

## 2026-09-04 GST/operator and private-address decision

The owner supplied authoritative GST-certificate facts: Syed Irfan Ullah
Quadri is the legal proprietor; AltCorp is the GST trade name/operator; the
constitution is proprietorship; the Karnataka Regular registration is
effective from 11 December 2025; and GoneViral is the product/website brand.
The certificate's unrelated additional trade name is out of scope and does not
appear in GoneViral code or documentation.

The exact GSTIN was supplied for owner/provider/accounting reconciliation but
is intentionally not copied into the public repository or website. GSTN's
public taxpayer search can expose principal-place information from a GSTIN.
The full registered principal place is the owner's residential/home address and
is private; it was not copied, inferred, reconstructed, printed, or committed.

Current official-source research found that Consumer Protection (E-Commerce)
Rule 4(2), rather than each individual policy or the GST website-display rules,
requires the operator's legal name and principal geographic address clearly,
accessibly, and prominently on the platform. One dedicated Contact/operator
disclosure, prominently linked from the footer, checkout, and relevant legal
surfaces, is the least-duplicative implementation; the full address need not be
repeated in every policy, footer, checkout form, disclosure, or metadata.

The owner authorizes only `4th Cross Road, Noor Khan Colony, Kalaburagi,
Karnataka 585104, India` for the dedicated public Contact/operator disclosure.
The house/flat number, building/premises name, and nearby landmark remain
private and must never be published, committed, rendered, logged, inferred, or
reconstructed. The address must not be duplicated in the footer, metadata,
checkout, or unrelated policies. The owner accepts the residual compliance/
privacy risk that omitting premise-level details may not satisfy every
interpretation of Rule 4(2). This is not lawyer approval and no longer blocks
remaining engineering work. A future genuine shared/co-working headquarters
with valid possession records can reduce this risk only after the applicable
GST/business records are amended; a cosmetic mail-forwarding address cannot.

CGST Rule 46 requires an invoice issued by a registered supplier to carry that
supplier's name, address, and GSTIN. Dodo documents itself as legal seller and
merchant of record on the customer transaction and says its customer invoice
carries Dodo tax details; on that model AltCorp's residential address is not a
customer-invoice field. The genuine Dodo live customer invoice and Indian-
business payout/reverse invoice must still be inspected before activation, and
the owner must settle the actual AltCorp-to-Dodo GST/accounting treatment from
those documents without inventing it. Full analysis and primary links are in
`PHASE_15_GST_OPERATOR_AND_ADDRESS_RESEARCH.md`.

Public operator/invoice-copy implementation commit
`d56777e744fc4cd5fc8b510de51ec6038fbaf153` uses the authoritative
AltCorp/proprietorship identity without storing the GSTIN or residential
address, adds the GST registration-status and Dodo invoice distinction on the
Contact surface, and clarifies Dodo's role immediately before checkout. The
focused public-board Playwright file passed 11/11 tests; Prettier, ESLint, and
TypeScript checking also passed. The authorized redacted-address implementation
is commit `7daf6a421fabc2545f1710d633a92558d3e56d45`. It places the
authorized address only on Contact and adds its public-board assertion. The
focused browser matrix passed 77/77 tests across configured desktop, mobile,
tablet, Firefox, and WebKit profiles; Prettier, ESLint, and TypeScript checking
also passed. The single final CI/merge/Preview refresh boundary is next. No
Preview, scheduler, provider, database, or other hosted state changed at this
checkpoint.

## 2026-09-04 support and Reply-To identity decision

The owner selected `goneviral.in@gmail.com` for public support, legal,
grievance, privacy-linked, and copyright correspondence and for transactional
application-email Reply-To. The branded application From and Supabase Auth SMTP
sender remain `notifications@updates.goneviral.in` and are intentionally
separate. Repository implementation updates the central legal identity and the
safe Preview-provider provisioning source; reserved test/example addresses are
unchanged. Preview `RESEND_REPLY_TO` was updated and read back as
`goneviral.in@gmail.com`; `RESEND_FROM_EMAIL` was read back unchanged as
`notifications@updates.goneviral.in`. No sender/domain authentication,
Supabase Auth SMTP, Production configuration, secret, or hosted data changed.
Implementation commit `c018f2e785bdb66a30eb2c0ee4261d5193dc846f`
updates the central legal email, safe provisioning source, and Contact/Copyright
browser assertions. The focused desktop legal-page test passed 1/1; repository
formatting, ESLint, TypeScript checking, PowerShell parsing, and diff checks
passed. The tracked repository contains zero occurrences of the superseded
address.

## 2026-09-04 production-shaped pre-launch transition

The owner authorized a non-commercial Production-shaped gate on Vercel Hobby
with Dodo remaining in Test Mode and explicitly selected the existing hosted
Supabase project `fndssapjkaicxzeruuvv` (`goneviral`, `ap-south-1`) as the
single Database/Auth/Storage data plane for Preview and Production. No second
Supabase project may be created, and the existing schema, migrations, Storage,
Auth configuration, required system data, and hosted business data must not be
reset or duplicated. The shared data plane is an accepted temporary exception;
safe cleanup and pre-live Preview contamination controls retain separate future
authorization boundaries.

The exact release candidate is protected-branch merge
`a44649064f2334ecd8340439cec9235481ca34d5`; required pull-request check
`quality` passed. Vercel Production deployment
`dpl_HgCf1iqWaAHskdgidJVpZsE23qLg` is READY from that exact commit, uses Mumbai
functions on Hobby, contains zero Vercel crons, and is aliased to
`goneviral.in`, `www.goneviral.in`, and the project domains. Live DNS/TLS checks
returned `200` from the apex through Vercel and a permanent canonical redirect
from `www` to the apex. Public/legal routes, `robots.txt`, and `sitemap.xml`
returned `200` with the Production canonical URL; the unauthenticated health
cron route returned the required `401` fail-closed response.

The pre-existing secret and provider values were extended to Vercel Production
without reading or printing them. Production-specific configuration sets
`NEXT_PUBLIC_SITE_URL=https://goneviral.in` and `PAYMENTS_ENABLED=true`, while
Dodo stays exactly `test_mode`. A new managed Turnstile widget is restricted to
the apex and `www` hostnames; its public site key and unread secret were stored
only in Production. Supabase Auth now uses the Production apex as Site URL and
allows the exact Production callback while preserving Preview and local
callbacks. The existing custom SMTP configuration was preserved.

Supabase CLI inspection found the ten local migrations equal to the ten hosted
migrations and table inspection succeeded. The only warning-level security
advisor result was the known leaked-password-protection setting. Hosted flags
remain fail closed: `payments_enabled=false`, `provider_refunds_enabled=false`,
`read_only=false`, and `outbound_redirects_enabled=true`. Production's Vercel
flag alone therefore cannot activate checkout. The database payment flag may
be enabled only through the authenticated admin/AAL2 workflow, never by an ad
hoc SQL bypass.

Aggregate-only inspection found five listings, six Test Mode attempts, five
Test Mode provider-payment records, five Test Mode financial-ledger entries,
and zero open/investigating reconciliation items. These records are preserved
for current pre-launch testing. Before Dodo Live Mode, a separately authorized
run of the repository's safe cleanup architecture must remove all synthetic/
Test Mode business data without manual financial-row deletion, preserve
infrastructure and required system data, and prove that neither the leaderboard
nor live ranking can be affected by Test Mode financial artifacts.

Cloudflare remains the sole scheduler. The existing Worker
`goneviral-scheduled-operations-staging` was updated in place so its only base
URL is `https://goneviral.in`; the enable guard remains `true`, both required
secret bindings remain present without disclosure, and the three schedules are
unchanged. Deployed Worker version
`cbeab8d8-234a-47f1-ada4-a8266125d5f0` contains this transition. The focused
Worker suite passed 9/9 and the Wrangler dry run succeeded.

One later bounded, read-only Vercel log query closed that transition check.
Starting with the first natural event at `2026-09-03T23:55:14.414Z`, the Worker
repeatedly invoked both five-minute Production routes and received `200`; the
natural hourly reconciliation invocation at `2026-09-04T00:17:08.822Z` also
received `200`. Later five-minute events continued on replacement Production
deployment `dpl_46QxV3nXmjz9wYQKs28r6kumNsbs`. No route was invoked manually,
no payload or secret was inspected, and the daily/failure-staleness evidence
retains its separately deferred status.

The remaining provider-side work is narrow. By sanitized owner report, the
existing Dodo Test Mode webhook was edited in place from protected Preview to
`https://goneviral.in/api/webhooks/dodo`; no product, credential, signing-secret
rotation, Live Mode action, or test event was requested. The existing Resend
webhook could not be edited in the provider UI, so the owner created a second
enabled endpoint at `https://goneviral.in/api/webhooks/resend`, saved its new
signing secret outside the repository, and updated the existing sensitive
`RESEND_WEBHOOK_SECRET` Vercel variable without disclosing its value. Vercel
metadata confirms that variable was updated at `2026-09-04T00:15:30.982Z` and
still targets Preview and Production.

Production was then redeployed from the existing artifact so no dirty local
documentation entered the build. Deployment
`dpl_46QxV3nXmjz9wYQKs28r6kumNsbs` is READY from exact commit
`a44649064f2334ecd8340439cec9235481ca34d5`, uses Mumbai functions on Hobby,
contains zero Vercel crons, and owns the Production aliases. An unsigned POST
to the Resend route returned the expected `400 invalid_webhook`, proving the
public route exists and rejects unauthenticated input without fabricating a
provider event. The subsequent genuine magic-link email produced two signed
POST deliveries to the Production Resend route at
`2026-09-04T00:25:43.669Z` and `2026-09-04T00:25:44.544Z`; both returned `200`
on that deployment. Payloads and recipient data were not inspected. The old
Preview Resend webhook may now be disabled but must not be deleted or have its
secret rotated. No Dodo Live Mode action, data cleanup, real payment, refund,
Vercel Pro purchase, commercial launch, or Phase 16 action is authorized.

The owner then disabled, without deleting or rotating, the old protected-
Preview Resend webhook. The Production webhook is now the sole enabled Resend
event destination for this shared pre-launch topology.

The owner then completed a genuine Production Supabase magic-link flow in the
owner's own browser. The consumed link returned to the exact Production callback
and rendered the authenticated `goneviral.in/manage?claimed=1` listing dashboard
against the existing shared hosted data. This closes the basic Production Auth
redirect/session/database-read smoke. No email address, magic-link token, URL
query secret, browser session, or private listing data is recorded here.

Before enabling the database payment flag, the owner paused the operation and
requested a guidance-first founder console suitable for a non-specialist
operator. Implementation preserves the existing Server Actions, admin
authorization, fresh AAL2 requirement, reason validation, and immutable audit
trail while replacing database-style labels with plain-language controls. It
adds the current three-step Test Mode launch path, runtime/payment/refund/read-
only status, queue counts, expandable control explanations, explicit effects,
disabled current-state buttons, a responsive premium layout, and a short exact-
current-gate instruction.

Pull request `#21` passed required `quality` run `33823519926`, including
formatting, lint, TypeScript, the full unit suite, Production build, browser-
bundle secret/source-map checks, dependency audit, and repository secret scan.
It was squash-merged as exact commit
`00c90b1c6fb03decb50667e65caaea7fea82840b`. Vercel Production deployment
`dpl_Adn8YtBDGEiqVDmXbENmq1uZ8i7q` is READY from that exact commit and owns the
Production aliases. The database payment flag and hosted business data remain
unchanged. One authenticated owner visual review of the new console is next.

The owner's first Production screenshot correctly showed the pre-AAL2 gate,
not the authenticated console, and exposed that this gate still used the old
bare presentation. Follow-up pull request `#22` gave the gate the same guided
visual system, explains what authenticator verification does and does not do,
and links to `/manage/security?reauth=admin` so successful verification returns
directly to the founder console. It does not alter authentication, authorization,
payments, or hosted data. Required `quality` run `33824955240` and both Vercel
checks passed. The pull request was squash-merged as exact commit
`d00ca998b5d32fc163fedfc860d54d812dc0c333`; Vercel Production deployment
`dpl_8CshPQ9K3nDNFpBHs1rL8wVKjgAh` is READY from that commit and owns
`goneviral.in` and `www.goneviral.in`. The owner should now refresh `/admin`,
review the explanatory security gate, and may privately complete MFA to inspect
the console. Neither review nor MFA enables payments; the database payment flag
remains disabled pending explicit owner action in the console.

The owner completed the Production admin verification privately and reached the
founder console as the active `reviewer`. The visual review found that the
always-visible `Safety controls` navigation link targeted a section omitted for
roles without `flags:manage`, so it looked interactive but had no destination.
The focused follow-up on `codex/phase-15-prelaunch-evidence` now always renders
that section: authorized roles receive the existing audited forms, while other
roles receive an explicit read-only explanation. The change does not broaden
permissions. The follow-up also removes unnecessary authentication internals,
verification timing, code-format detail, and the account email from the admin
UI while retaining the existing Supabase MFA flow and server-side role checks.
Local formatting, lint, TypeScript, 24 focused MFA/auth/permission tests, and the
Next.js Production build pass. Merge, Production deployment, and owner refresh
remain pending; the database payment flag is still disabled.

The owner subsequently confirmed that this is a single-founder operation and
explicitly authorized changing only the sole active, non-revoked admin entry
from `reviewer` to `super_admin`. A guarded hosted-database update first required
exactly one eligible row, changed only that row, and then verified
`role=super_admin`, `is_active=true`, and `revoked_at IS NULL`. No other admin
user, permission definition, safety control, or security setting changed.

The owner's authenticated Production screenshot then confirmed the
`super_admin` account can see the real Safety Controls forms. The visible flag
states remained unchanged: Test checkout off, provider refund calls off,
read-only safety mode off, and outbound listing links on.

Pull request `#23` contains the focused navigation and minimal-verification-copy
follow-up. Its Vercel Preview deployment passed, and required CI run
`33826027048` attempt 3 passed install, formatting, lint, TypeScript, the full
unit suite, Production build, and browser secret/source-map inspection. The run
failed solely because `pnpm audit --audit-level=moderate` could not reach
`https://registry.npmjs.org/-/npm/v1/security/advisories/bulk`: error `23`
retried twice and ended with `The operation was aborted due to timeout`. No
vulnerability finding was returned. The subsequent repository secret scan was
skipped because the preceding audit command failed. Per owner direction, do not
start more full reruns while that external endpoint is unavailable and do not
weaken the audit gate. GitHub branch protection therefore blocks the merge; no
new Production deployment was created.

After another fresh endpoint timeout, the owner authorized a minimal resilient
fallback. A sanitized configuration audit found no repository or user
`.npmrc`, no custom registry/proxy/audit URL/redirect, and both npm and pnpm
resolve to the official `https://registry.npmjs.org/`. The failure is therefore
the official npm bulk-advisory request timing out, not repository or workstation
configuration. CI now keeps `pnpm audit --audit-level=moderate` as the primary
gate, permits fallback only for explicit audit-service timeout/network/5xx
failures, fails closed on findings or unrecognized errors, and conditionally
runs a SHA-pinned Google OSV-Scanner against the committed `pnpm-lock.yaml`.
The repository's selected-action allowlist was extended only for that exact
scanner action SHA; mandatory SHA pinning, branch protection, and required
checks are unchanged. Formatting, lint, TypeScript, 227 unit tests, the
Production build, and browser secret/source-map inspection pass locally. One
new required PR run, merge, and Production deployment verification remain
pending. No Safety Control changed.

Required CI run `33862932706` then exercised the fallback once. npm again timed
out without a finding; OSV-Scanner parsed the committed `pnpm-lock.yaml`, found
798 packages, reported `No issues found`, and exited `0`. The full `quality`
job, repository secret scan, and both Vercel Preview checks passed. Pull request
`#23` was squash-merged through the normal protected-branch policy as exact
commit `d2a5d57028d37903cee900c770cd29dbbc897ef2`.

Vercel Production deployment `dpl_4yzXzftFxQrZpv2FbbG4Pesep2Ln` is READY from
that exact commit and owns `goneviral.in`, `www.goneviral.in`, and the project
aliases. The apex and `/admin` returned `200`; `www` returned the expected
permanent redirect to the apex. The owner's next action is a review-only refresh
of `/admin` to confirm the minimal verification copy and Safety Controls
navigation. No control should be toggled during that review; Test checkout and
the other hosted flags remain unchanged.

The owner completed that authenticated Production visual review and confirmed
the Safety Controls section is good. This closes the admin navigation/copy
review gate. The confirmation did not authorize or perform a control change;
Test checkout remains off pending a separate explicit owner instruction.

The owner then explicitly authorized the next gated action: enable only the
`payments_enabled` / Test checkout control for the Production-shaped Dodo Test
Mode smoke. Execution remains pending in the owner's authenticated founder
session. This authorization does not cover provider refunds, read-only mode,
outbound-link changes, Dodo Live Mode, cleanup, or a real transaction.

The owner used the authenticated audited console and reported Test checkout
ON. A read-only hosted verification confirmed
`payments_enabled=true`, with the latest immutable audit event recording
`operational_flag_updated` by `super_admin` from `false` to `true`. The same
query confirmed `provider_refunds_enabled=false`, `read_only=false`, and
`outbound_redirects_enabled=true`. No other control changed. The next business-
data-producing step is the already scoped synthetic Dodo Test Mode purchase;
no Live Mode or real transaction is authorized.

The owner completed that synthetic Dodo Test Mode purchase and reported that
the confirmation email arrived. A read-only hosted verification found the
latest succeeded attempt at ₹501 with exactly one processed provider event,
one financial-ledger entry, one confirmation-email outbox record, a matching
₹501 listing total, and current main rank `#2`. No recipient address or raw
provider payload is recorded here. The owner then requested a focused premium
redesign of the successful-payment screen and its generated listing share card,
including the GoneViral mark and the listing logo when available. This is a
presentation-only follow-up: payment logic, safety controls, permissions,
financial data, Dodo mode, and cleanup remain unchanged.

Pull request `#24` completed that focused follow-up and passed required CI run
`33867712592`: formatting, lint, TypeScript, unit tests, Production build,
browser secret/source-map inspection, npm's moderate dependency audit, and the
repository secret scan all passed. npm responded normally, so the OSV fallback
was correctly skipped. The pull request was squash-merged as exact commit
`8c2f675274aa2e43659b38159613d32f67f9276c`. Vercel Production deployment
`dpl_5VGgaKDBPhjjwYRyzcPg6rnL64zr` is READY from that commit and owns the apex
and `www` aliases. Live visual verification confirmed the premium rank-reveal
screen and the 1200×630 downloadable card, including the GoneViral mark and the
actual sanitized listing logo. Because stored listing logos are WebP and the
social-image renderer does not accept WebP directly, the route converts only
the fetched public logo bytes to PNG in memory and falls back to the GoneViral
mark on failure; stored assets are unchanged. No Safety Control changed.

The owner then requested a focused redesign of only the public listing detail
surface and its downloadable card. Pull request `#25` passed required CI run
`33872785916` and both Vercel checks, then squash-merged normally as exact
commit `397a037b508a9be240ee3f1446b11cb0ac225dfb`. Production deployment
`dpl_9Jd3WKBqZw7xA4RjVespCLyYMNE3` is READY from that commit and owns the apex
and `www` aliases. Live desktop and 390px mobile checks found no horizontal
overflow, browser errors, or WCAG A/AA violations. The public listing and its
1200×630 card render the actual listing logo, dynamic rank, confirmed placement
total, and rank-check date. No payment, ranking, database-write, checkout,
webhook, admin, scheduler, or Safety Control behavior changed. The next action
is owner visual approval only; do not continue Phase 15 work from this gate.

The owner's visual review found the rank hierarchy ambiguous and the page too
tall. Pull request `#26` clarified the overall and Today's leaderboard ranks in
one side-by-side panel, reduced the competitive checkout prompt to a small
explicit estimated target, compacted the page through its sharing controls, and
softened the social-card background/rank panel while moving its sponsored label
to the lower-left edge. Required CI run `33880545146` and both Vercel checks
passed; the pull request squash-merged normally as exact commit
`0bfd050115a79c3237ab5b9cfd94a1a0432bfc8e`. Production deployment
`dpl_BW43Ajkxf4gyrAc7Z8fx5mGEFLUu` is READY on the apex and `www` aliases.
Live Production inspection confirmed that the desktop viewport includes the
listing, both clearly labeled ranks, checkout target, and share controls above
the fold, and that the 1200×630 image renders the actual logo, softer gradient,
translucent rank panel, placement amount, rank-check date, and tiny lower-left
sponsored label. No business logic or control state changed. The next action is
owner visual approval only; do not continue Phase 15 work from this gate.

The owner approved this final public-listing presentation and chose to keep the
public page identical for signed-in owners and ordinary visitors. Owner-only
actions remain confined to the authenticated `/manage` surfaces; no conditional
owner disclosure or public-page behavior should be added. The presentation gate
is closed. The next launch-critical workstream is the remaining bounded,
non-destructive Production certification (monitoring/alert delivery, Turnstile,
Storage, backup freshness, and rollback/pause evidence where still outstanding).
Do not change Safety Controls, Dodo mode, hosted data, or begin pre-live cleanup
without their existing separate authorization gates.

The owner then authorized a focused homepage/leaderboard presentation follow-up
and explicitly retained the product's tracked card-click behavior: the whole
listing card opens the submitted website through `/go/[slug]`; there is no
separate `Visit website` control. The owner also chose 10 public listings per
page followed by stable cursor pagination. The implementation adds the compact
premium hero and board treatment, keeps the paid-placement and
manual-refresh truth disclosures, shows only one truthful open-position prompt,
limits recent activity to four real events, preserves tracked click totals, and
keeps details/takeover controls independently operable. Local formatting, lint,
TypeScript, 23 focused unit tests, 8 database read-model tests, the Production
build, and focused desktop/390px Production-browser scenarios pass, including
WCAG checks, no horizontal overflow, outbound redirect/click persistence, and
Main/Today/category/listing navigation. No hosted state, Safety Control,
payment/ranking behavior, provider mode, or Production deployment changed.

The owner's subsequent visual-review decision makes the card-wide submitted-
website destination deliberately dominant. The prominent `View details` button
is now a quiet inline `See details` metadata link, still independently operable,
and the public metric reads `clicks` rather than `tracked clicks`. The tracked
`/go/[slug]` redirect, click collection/deduplication/totals, takeover action,
and all payment/ranking/security behavior are unchanged. Focused desktop and
390px Production-browser verification passes, including accessibility and
overflow checks. At that review point no hosted or Production state changed.

The owner next approved the focused visual-hierarchy pass without changing the
architecture or product logic. The homepage has the compact premium
hero and `Get listed` wording, truthful `Live leaderboard` heading with exact
freshness/manual refresh, grouped filters, denser 1180px cards, gold/silver/
bronze top-three rank markers, and a restrained laurel/leader treatment for
number one. The `Top 3` divider renders only when a lower-ranked listing follows;
the matching `Top 20` divider is data-dependent and does not appear until the
board continues beyond rank 20. Recent movements and the grouped footer were
polished using the existing real records and links. The dominant card-wide
tracked `/go/[slug]` destination, quiet independent `See details`, independent
takeover action, public clicks, ten-item stable cursor pagination, and all
ranking/payment/tracking/privacy/security/business behavior remain unchanged.
Formatting, lint, TypeScript, 23 focused unit tests, the Production build, and
four focused desktop/mobile Production-browser scenarios pass. Review captures
are in `artifacts/homepage-polish-2026-09-04/`. At that review point no hosted
or Production state changed.

The owner rejected the first polish as still over-explained and directed an
Outbid-inspired density pass without copying Outbid's identity. Live desktop
and 390px reference inspection established that only the category rail should
scroll horizontally; leaderboard cards and Recent Moves should remain compact
vertical rows. The homepage removes the repeated trust/disclosure
copy from the masthead, uses a lightweight How it works link, shortens the hero,
replaces the mobile Menu label with an accessible icon, removes control-label
clutter, uses one matching outline-laurel family and restrained tonal surfaces
for all three podium ranks, intentionally composes mobile cards into identity
and spend/action rows, and tightens Recent Moves and the mobile footer. At
390×844, rank #1 begins at about 531px; neither the page nor Recent Moves has
horizontal overflow. Ranking, payments, tracked `/go/[slug]`, public clicks,
details, takeover quotes, activity data, cursor pagination, security, database,
and hosted state are unchanged. Formatting, lint, TypeScript, 23 focused unit
tests, the Production build, and focused 1440px/390px browser checks pass. New
review captures are in `artifacts/homepage-refinement-2026-09-04/`.

The owner then authorized a presentation-only join-flow continuation. Public
`Get listed` and `Take #...` client navigations now reuse the existing form in
an intercepted desktop dialog or mobile full-height sheet; direct `/join`
visits remain standalone. Target pricing and every existing validation,
Turnstile, payment, listing, rank, and ownership path are unchanged. The
backdrop never closes the form, the background is inert and scroll-locked, and
dirty close, desktop Escape, and Browser Back require explicit discard
confirmation while untouched close does not prompt. Focused TypeScript, lint,
nine join-domain unit tests, and local 1440px/390px browser scenarios pass,
including valid submission to deterministic local mock checkout and no
horizontal overflow. Captures are in `artifacts/join-overlay-2026-09-05/`.
At approval time no hosted state, provider configuration, Safety Control, or
Production deployment had changed.

The complete approved homepage and intercepted join-flow series was committed
as `cac7dfabe72598701cc259036c1cb360e6aded71` and landed through protected pull
request `#28`. Required `quality` CI run `33911327013` passed, both Vercel
checks passed, and the pull request squash-merged as
`3299fef13770f3ce7657ca0045a31540d9a30dbf` on the default
`codex/phase-15-staging` branch. Vercel Production deployment
`dpl_AFfg2NBdTCe6ZXeBd4n2qNVRPumj` is READY from that merge and owns the apex
and `www` aliases.

The bounded live smoke passed: the homepage loaded; desktop `Get listed` and a
targeted `Take #...` opened the correct overlay and target/price context; the
backdrop did not dismiss it; deliberate close worked; direct `/join` remained
standalone; and 390px mobile used the full-height scrollable sheet with correct
scroll locking and no horizontal overflow. No payment was submitted. Local and
remote `codex/phase-15-staging` matched the merge commit and the worktree was
clean before the scoped documentation/evidence branch began. The approved
homepage and join overlay must not be redesigned or reverted. The current work
is limited to the remaining bounded, non-destructive Production certification
and naturally available Cloudflare daily/failure/staleness evidence.

## 2026-09-05 bounded Production certification evidence

Sentry Production configuration, ingestion, and genuine alert delivery are
certified. Vercel lists the intentionally public DSN plus the build-only
organization, project, and auth-token variables on Production. Build logs for
exact release `3299fef13770f3ce7657ca0045a31540d9a30dbf` show successful
client and server artifact-bundle/source-map uploads to Sentry and deletion of
uploaded maps from the public build. One fixed, synthetic, PII-free error event
carrying only the Phase 15 certification label, `production` environment, and
exact release was accepted by the configured Sentry ingest endpoint with HTTP 200. The event did not contain customer, payment, provider, request, credential,
or private business data. On 2026-09-05 the owner reported receiving the
resulting Sentry email, which supplies genuine notification-delivery evidence
without storing the recipient, subject, event URL, or payload. No delivery was
inferred from HTTP acceptance alone.

Turnstile Production configuration and safe verification are certified without
another form submission. The live `https://goneviral.in/join` page loads the
Cloudflare Turnstile script and renders one challenge container with a present
24-character Production site key, response field, and exact `join` action. The
Production environment uses `TURNSTILE_MODE=cloudflare` with an encrypted
secret. A read-only sanitized Cloudflare listing found exactly one account
widget, in managed mode, restricted to exactly `goneviral.in` and
`www.goneviral.in`; the listing exposed no secret field. The server accepts a
Turnstile result only when Cloudflare returns success, action `join`, and
hostname equal to the configured Production site hostname. The
already-certified ₹501 Production Dodo Test Mode purchase could not have reached
checkout creation without passing that real server-side boundary, so it
supplies the genuine Production verification without creating another attempt
or payment. No challenge was solved, token was printed/reused, form was
submitted, or hosted data was changed during this bounded recheck.

Supabase Storage Production verification is certified against the authorized
shared project with aggregate/read-only evidence. Both expected buckets exist:
`goneviral-logo-public` remains public and currently contains four sanitized
objects, while `goneviral-logo-staging` remains private and currently contains
zero objects. There are zero `storage.objects` SELECT/ALL policies granted to
browser roles. One existing public logo returned HTTP 200 as `image/webp` with
5,342 bytes directly from the linked project's Storage endpoint, consistent
with the live Production board rendering. No object name/path, response body,
credential, private record, or hosted mutation was exposed or performed.

Encrypted-backup staleness detection and current freshness are certified. The
first bounded check found the then-newest archive 108.38 hours old, well outside
the documented 24-hour baseline, and correctly reported a real blocking stale
state. The owner then ran `pnpm ops:backup:hosted` in their own terminal, entered
the passphrase only through 7-Zip's masked prompts, and reported `Everything is
Ok` plus successful encrypted-archive verification. The fresh archive is
`D:\GoneViral-Backups\20260904T201904Z-fndssapjkaicxzeruuvv.7z`, 77,952 bytes,
last written `2026-09-04T20:20:18.9970020Z`, with its matching `.7z.sha256` and
exact source commit `3299fef13770f3ce7657ca0045a31540d9a30dbf`. An independent
local check confirmed both files are present, the recomputed SHA-256 matches,
and the corresponding plaintext directory count is zero.

Daily automated backup cadence remains open: Windows Task Scheduler contains
zero GoneViral/Supabase backup tasks. The owner was instructed that an optional
off-device private copy must contain only this `.7z` and matching `.7z.sha256`,
with the passphrase kept separately in the approved password manager; no upload
is claimed here. Codex did not start the interactive prompt, read or store the
passphrase, access backup contents, prune archives, or change hosted state.

Rollback and payment-pause capability/procedure evidence is certified without
performing a live state change. The current PR `#28` Production deployment
`dpl_AFfg2NBdTCe6ZXeBd4n2qNVRPumj` and earlier known-good PR `#26` deployment
`dpl_BW43Ajkxf4gyrAc7Z8fx5mGEFLUu` both remain READY. The authenticated Vercel
CLI exposes `vercel rollback <deployment>` and `vercel promote <deployment>`;
its status check reports no rollback in progress. During an approved incident,
the rollback procedure is to target the known-good deployment, verify the apex,
`www`, health, and affected surface, then re-promote the current deployment
after recovery. No rollback/promotion command was run.

The current hosted flags are exactly Test checkout on, provider refund calls
off, read-only safety mode off, and outbound links on. The sole `super_admin`
can use the existing fresh-AAL2 `/admin` Safety Controls form to pause only new
checkout creation by setting `payments_enabled=false` with a reason; the
transaction writes the flag and immutable audit together. Signed inbound Dodo
events and reconciliation intentionally remain available so authoritative
provider state can converge. Aggregate evidence shows two payment-flag audit
events, including the certified Production `false` to `true` event, and the
earlier staging shutdown plus database/integration evidence already prove the
disabled path. The incident recovery procedure is to inspect/reconcile first,
then use the same audited control to re-enable only after owner approval. No
Safety Control or Production traffic state changed during this check.

Cloudflare daily automatic cadence is now certified from naturally available,
read-only provider analytics. Successful scheduled invocations appeared at
`02:40:15Z`, `02:43:08Z`, and `02:45:15Z` on 2026-09-04. The isolated middle
event is the exact daily `43 2 * * *` slot and recorded one request, zero Worker
errors, and two subrequests, matching the two fixed daily cleanup routes. The
Worker throws when any assigned route is non-2xx, redirected, timed out, or
fails at the network layer, so the successful scheduled outcome certifies both
daily operations. The bounded Production window contained 331 successful
Worker invocations, zero runtime errors, and 638 subrequests.

That same window contained no naturally occurring failure, so genuine failure-
notification delivery remains pending rather than inferred from implementation
tests. Owner-visible stale/missing-run detection also remains pending: the
current Worker records invocations but has no independent monitor that can
notify when an invocation never occurs. No route was manually invoked; no
failure was forced; and no trigger, binding, secret, Worker version, scheduler,
or hosted business state changed.
