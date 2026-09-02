# Phase 15 private staging current state

Last updated: 2026-09-03 (Asia/Kolkata)

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

The abandoned-checkout lifecycle gap is also fixed locally. Before the
authenticated operational-health route collects metrics, an atomic count-only
operation changes only elapsed `checkout_ready`, `customer_returned`, and
`provider_pending` attempts to local `expired`. It is idempotent, leaves
pre-checkout stalls visible for investigation, does not claim provider failure,
and preserves the tested rule that authentic late provider success supersedes
local expiry. The previously diagnosed hosted Test Mode row was not changed;
it will remain as-is until this application commit is deployed and the route
runs under separate authorization.

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
- `vercel.json` has five authenticated jobs. Daily logo cleanup and retention
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
external scheduler alone cannot make it a valid production host. The owner will
select the commercial production host and plan immediately before launch and
then verify its cost, rollback/pause, notification, and residual billing risks.

The exact evidence, limits, schedules, sequential remaining Phase 15 work, and
measured paid-upgrade triggers are recorded in
`PHASE_15_BUDGET_CONSTRAINED_LAUNCH_PLAN.md`. The public-repository audit and
manual protected-Preview route certification are complete. Cloudflare design
review, implementation, interactive setup, automatic cadence, and failure/
staleness certification are next. Deployment, `goneviral.in`, live credentials/
payments/refunds, prelaunch cleanup, and Phase 16 still require their existing
separate authorizations.

## Production boundary

Do not repeat the whole staging suite in production. If production is later
authorized only after the written provider, legal, accounting, infrastructure,
isolation, backup, and security gates pass, run the automated release suite on
the exact release commit and then a minimal non-destructive production smoke
test for production-specific credentials/configuration, DNS/TLS, Auth/email,
webhooks, cron, security isolation, monitoring, rollback, backup, and one
explicitly authorized legitimate founder-owned transaction. No production gate
is currently satisfied merely because private staging works.
