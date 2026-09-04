# GoneViral project completion master plan

Last updated: 2026-09-05 (Asia/Kolkata)

## Purpose and authority

This is the persistent zero-to-100 completion index for GoneViral. Every future
Codex task must read it after `AGENTS.md` and update it when a material owner
decision, completed workstream, evidence result, blocker, or next action
changes. It is deliberately concise and points to authoritative specifications
and evidence rather than duplicating them.

It does not override this authority order:

1. new owner instructions;
2. `../goneviral-specs/00_DECISIONS_AND_PRODUCT_RULES.md`;
3. `../goneviral-specs/03_DATABASE_PAYMENTS_AND_SECURITY.md`;
4. the active phase in `../goneviral-specs/04_CODEX_IMPLEMENTATION_PLAN.md`;
5. the active phase runbook;
6. relevant operational documents under `docs/`.

Never place credentials, secret values, magic links, MFA material, webhook
bodies, payment-card/customer data, backup passphrases, or private backup
contents in this file.

## Overall status

| Scope                                      | Status                                                 | Evidence/source                                       |
| ------------------------------------------ | ------------------------------------------------------ | ----------------------------------------------------- |
| Phases 0–14                                | Complete                                               | Git history and phase documents under `docs/`         |
| Phase 15 risk-based private staging        | Frozen Preview RC; lifecycle verified                  | `PHASE_15_STAGING_CURRENT_STATE.md`                   |
| Phase 15 isolated backup remediation       | Complete                                               | restore and 66/66 database evidence in the checkpoint |
| Pre-launch scheduler hardening             | 1m/5m/hourly/daily candidate; rollout evidence pending | `CLOUDFLARE_SCHEDULED_OPERATIONS.md`                  |
| Public-repository content audit            | Passed; owner already made repo public                 | `PHASE_15_STAGING_CURRENT_STATE.md`                   |
| Public-repository settings hardening       | Complete                                               | `PHASE_15_STAGING_CURRENT_STATE.md`                   |
| Phase 15 production-shaped pre-launch gate | Deployed; bounded certification active                 | checkpoint exact resume point                         |
| Commercial Production launch               | Not authorized/not complete                            | Phase 15 runbook                                      |
| Phase 16                                   | Not started                                            | implementation plan                                   |

Active integration branch: `codex/phase-15-staging`.

The budget-plan commit pushed before scheduler implementation was
`28378def9f6a19f27129eecb244aec5c6695cf47`.

## Locked current owner decisions

- Initial database/Auth/Storage plan: Supabase Free, with explicit acceptance
  of no managed PITR, possible inactivity pause, self-managed backup dependence,
  weaker recovery guarantees, and possible recovery downtime.
- The existing hosted Supabase project `fndssapjkaicxzeruuvv` (`goneviral`,
  `ap-south-1`) is the single pre-launch Database/Auth/Storage data plane for
  both protected Preview and Vercel Production. Do not create a second Supabase
  project. This temporary sharing is owner-accepted while Dodo remains in Test
  Mode. Preview isolation is post-launch hardening, not a current gate.
- Staging scheduler: one minimal Cloudflare Worker on Workers Free. GitHub
  automatic scheduling is retired, manually disabled, stripped of its
  automatic trigger, and has no enable variable. Vercel Cron is not selected
  for staging.
- Scheduler cadence: email outbox every minute; operational health every five
  minutes; reconciliation hourly; cleanup daily. Delayed or
  dropped scheduled runs catch up through durable/idempotent workers.
- Existing VPS is reserved for OTTR and is out of scope for GoneViral.
- Do not purchase or require Vercel Pro during staging. Production will use
  Vercel plus Supabase, with Vercel Pro purchased immediately before commercial
  launch and its cost, rollback/pause, and operational controls reviewed then.
- Cloudflare Workers Cron is the final scheduler topology. Vercel Cron must not
  be registered in Production.
- The owner confirms Dodo merchant/KYC/business/bank/live capability and the
  GoneViral brand setup for the sponsored-listing model. Do not retain a
  separate written model approval as a blocker unless Dodo requests it.
- The owner will launch with owner-drafted public policies and owner-managed
  GST/invoice/payout/accounting treatment. External lawyer and CA review are
  optional risk reduction and must not be represented as completed.
- The owner supplied authoritative GST/operator data: Syed Irfan Ullah Quadri
  is the legal proprietor, AltCorp is the Karnataka Regular GST trade
  name/operator effective 11 December 2025, and GoneViral is the product brand.
  The exact GSTIN and omitted premise-level residential details stay outside
  the public repository and website. Only the owner-authorized privacy-
  minimized address appears on the dedicated Contact/operator disclosure; its
  residual Rule 4(2) interpretation risk is owner-accepted, not lawyer-
  approved. The unrelated additional trade name must never appear on GoneViral
  surfaces.
- The public support, legal, grievance, privacy, and copyright address is
  `goneviral.in@gmail.com`. Transactional Reply-To uses the same address. The
  branded application and Supabase Auth senders remain
  `notifications@updates.goneviral.in`; support/Reply-To and From identities
  are intentionally separate.
- Upgrade Supabase/Vercel further only after measured traffic, reliability need,
  or revenue justifies it.
- The production-shaped Vercel Production deployment, `goneviral.in`
  attachment, Production configuration, Dodo Test Mode payments, and
  non-destructive certification are authorized on Vercel Hobby. Dodo Live Mode,
  a real transaction, destructive cleanup, Vercel Pro purchase, commercial
  launch, refunds, and Phase 16 remain separately gated.

## Completed foundation: Phases 0–14

The application, domain policy, private database model, public board, checkout
intent, verified webhook/ledger flow, ownership, raises/concurrency, safe logos
and edits, refunds/reconciliation, moderation/admin, activity/sharing, email,
security/observability, and quality/performance work are implemented. Consult
the corresponding phase documents and Git history for exact scope and tests.
Do not rerun these phases wholesale merely because a new task starts.

## Active phase: Phase 15

### Completed

- Risk-based private staging certification and subsequent local deferred-gate
  closure.
- Seven-project automated browser matrix and exact-candidate release suite.
- Corrected encrypted Supabase backup procedure, two remediation iterations,
  isolated Auth/Storage boot, exact payload comparisons, integrity/advisor/
  migration checks, 66/66 restored database tests, and sensitive-artifact
  cleanup.
- Read-only proof that Vercel Hobby cannot run the committed sub-daily schedules
  and cannot host the commercial production launch under current terms.
- Owner selection of Supabase Free risk posture. The initial GitHub Actions
  scheduler was later retired after the bounded diagnostic below.
- Guarded GitHub Actions scheduler implementation and focused local
  verification in `3b6e8a8327ecadbf1242b2ba8114d7a228e1c9d1`.
- Protected Vercel Preview authentication support, two-secret safe request
  construction, and focused verification in
  `a6bc5289a7a0b9dd9222ae6ba9bc332d81b30109`, pushed with its primary evidence
  in `aaacf4b8715a0d6255f394e2a8788dfbf72b690a`.
- Complete reachable-history/current-tree/workflow/tag safety audit. The owner
  had already made the repository public; Codex did not change visibility.
- Scheduler implementation and primary evidence pushed to the existing origin
  branch with matching local/tracking/remote refs.
- Expected GitHub scheduler secret and base-URL variable names configured by
  the owner without secret-value disclosure. After explicit activation
  authorization, the exact enable variable was created and all five manual
  protected-Preview operations passed with safe HTTP 200 logs.
- Secret scanning/push protection, restricted SHA-pinned Actions, read-only
  workflow permissions, and an active no-bypass default-branch PR/strict-CI
  ruleset configured and verified.
- Fresh-run CI route-type prerequisite fixed by running `next typegen` before
  TypeScript; required pull-request `quality` run `33649828937` passed the full
  format/lint/typecheck/test/build/security/audit pipeline.
- Narrow GitHub schedule-registration diagnostic completed. The workflow,
  default-branch contents, and cron strings were correct and active, but the
  Actions API returned zero scheduled events. Explicit already-UTC schedule
  metadata was merged in `fcaf1a206c9f046f900eefd04e1988ba7c93ca3d` to force
  reprocessing without changing cadence or job logic; a bounded post-merge
  check still returned zero events.
- The manual operational-health warning was resolved diagnostically with a
  read-only, aggregate Supabase inspection. Exactly one Dodo `test_mode`
  `initial_sponsorship` attempt remained in `checkout_ready` after its checkout
  expiry. It had no provider event, provider payment, fulfilled ledger entry,
  success timestamp, or open reconciliation item. This is consistent with an
  abandoned staging checkout and is not evidence of a live charge. No record
  identifier was returned or recorded, and no row was modified.
- After declining a GitHub Support case, the owner authorized an isolated,
  credential-free schedule canary. Its manual run passed, but neither active
  workflow ever received a scheduled event by the later bounded recheck. The
  owner ended further debugging. Both workflows were manually disabled, the
  enable variable was deleted, the canary files were removed, and the main
  GitHub workflow's automatic trigger was removed. The two GitHub secrets and
  non-secret base-URL variable were left untouched.
- The owner selected Cloudflare Workers Cron for private staging and deferred
  any Vercel Pro purchase or production host/plan decision until immediately
  before commercial launch. The exact three-trigger, two-secret, fail-closed
  proposal is in `CLOUDFLARE_SCHEDULED_OPERATIONS.md`. That design decision
  itself made no Cloudflare change; the later inert deployment is recorded
  below.
- The owner confirmed Workers Free and at least three unused Cron Trigger
  slots. The dependency-free scheduled-only Worker, exact three-trigger route
  map, disabled guard, safe request/log behavior, pinned Wrangler CLI, and
  focused tests were implemented locally without creating a Cloudflare
  resource or hosted GoneViral request. The later inert deployment is recorded
  below.
- Elapsed checkout-bearing payment attempts now transition idempotently to
  local `expired` at the start of authenticated operational-health checks.
  Pre-checkout stalls remain visible, no provider failure is inferred, and the
  existing authentic late-success path remains authoritative. The previously
  diagnosed hosted Test Mode row was not modified during implementation.
- The exact local candidate passed Worker tests (8/8), the full unit suite (43
  files, 223 tests), the full local database suite (12 files, 67 tests),
  formatting, lint, typecheck, production build, client-build leak scanning,
  dependency audit, and a guard-false Wrangler dry run. These results are not
  hosted Cloudflare cadence evidence.
- Protected pull request `#10` final required CI run `33670289167` passed the
  exact candidate through install, format, lint, typecheck, unit, build,
  client-leak, audit, and Gitleaks checks. It squash-merged as
  `fd7a59bd44e167633bb877e5b2837c00ac200e2b`. The unrelated nonrequired Vercel
  deployment check remained failed; no deployment occurred.
- The first owner-run inert Cloudflare deployment was rejected before creation
  solely because compatibility date `2026-09-03` was future-dated in
  Cloudflare UTC. The narrow patch pins `2026-09-02`; Worker logic, schedules,
  bindings, guard, secrets, Preview URL, and hosted state remain unchanged.
- On 2026-09-03 the owner reported that the corrected inert Worker deployment
  succeeded, exactly three Cron Triggers exist, the guard remains exact
  lowercase `false`, and both required Worker secret names are present. No
  secret value was disclosed or read. This is inert setup evidence only; no
  automatic route execution or cadence result is claimed.
- On 2026-09-03 the owner explicitly authorized scheduler activation. The
  checked-in guard changed from `false` to `true` with its focused assertion;
  required CI passed and protected pull request `#14` squash-merged as
  `e813fb6de43ea9b4979bc8f7abefa9d485dab787`. No deployment or hosted route
  invocation was performed by that repository change.
- The owner subsequently reported that the activated Worker deployment
  succeeded and the Cloudflare dashboard shows the guard as exact `true`. No
  secret value or raw deployment output was provided. Automatic five-minute,
  hourly, daily, and failure/staleness evidence remains pending.
- On 2026-09-04 the owner reported repeated successful five-minute events:
  email outbox and operational health each returned `200 / ok`. One hourly
  event fired and reconciliation returned `200 / ok`. No errors were visible
  in the observed window. The daily trigger had not yet reached its next
  scheduled time and remains pending, not failed.
- Read-only Vercel inspection proved the protected alias still served old
  application commit `682969e41cbfba73bb4b2d81681eb2abd2dbe509`, without the
  abandoned-checkout lifecycle fix. The authorized Preview-only deployment of
  exact clean commit `b8298a798efce1195b7c5ad38add60d8a54b2fd1` became READY as
  `dpl_8bkWCCVgSwqXZEy9LN5fqggbPTcN`, registered zero Vercel crons, remained
  protected, and became the stable alias target. Production was untouched.
- The next normal authenticated Cloudflare health operation ran on the new
  deployment, expired exactly one elapsed checkout-bearing Test Mode attempt,
  and reported zero alerts. Aggregate database evidence confirmed zero
  remaining elapsed checkout-bearing nonterminal attempts and no provider
  event/payment, fulfilment, ledger, success, or open reconciliation side
  effect for the transitioned attempt. No hosted row was edited manually.
- Application commit `b8298a798efce1195b7c5ad38add60d8a54b2fd1` is the frozen
  Preview release candidate. Its exact tree passed required CI run
  `33798001313` and the complete final local release matrix, including 223/223
  unit, 67/67 database, and 77/77 seven-project Playwright tests. The
  production-readiness decision is no-go until the external and
  production-specific gates below close.

Exact sanitized evidence and commits are in
`PHASE_15_STAGING_CURRENT_STATE.md`. Preserve the existing staging shutdown.

### Next task

Pull request `#23` passed required CI run `33862932706` and was squash-merged as
`d2a5d57028d37903cee900c770cd29dbbc897ef2`. npm again timed out, so the
owner-authorized pinned OSV fallback scanned all 798 packages represented by the
committed lockfile and reported no issues; findings and unrecognized failures
remain blocking. Production deployment `dpl_4yzXzftFxQrZpv2FbbG4Pesep2Ln` is
READY from that exact commit, owns the apex and `www` aliases, and passed basic
HTTP checks. The owner should now refresh `/admin` and perform only a visual
review of the minimal verification copy and Safety Controls navigation without
toggling a control. That authenticated review is now owner-confirmed good and
the admin navigation/copy gate is closed. The sole active admin remains verified
as `super_admin`. Await separate explicit owner authorization before enabling
only the database `payments_enabled` flag. The owner has now given that exact
authorization; use the audited console control from the owner's authenticated
session and verify the resulting state without changing another control. That
change is now verified: Test checkout is on, its immutable `super_admin` audit
receipt records `false` to `true`, and refunds/read-only/outbound-link controls
remain respectively off/off/on. The owner then completed one synthetic Dodo
Test Mode purchase for ₹501 and reported receiving the confirmation email.
Read-only hosted evidence confirms exactly one processed provider event, one
ledger entry, one confirmation-email outbox record, the matching ₹501 listing
total, and current main rank `#2`. The successful-payment screen and generated
listing share card were upgraded and shipped through pull request `#24` as
merge commit `8c2f675274aa2e43659b38159613d32f67f9276c`. Required CI run
`33867712592` passed, npm's moderate audit responded cleanly, and Vercel
Production deployment `dpl_5VGgaKDBPhjjwYRyzcPg6rnL64zr` is READY on the apex
and `www` aliases. Live verification confirms the new confirmation layout and
the branded 1200×630 card render correctly with the actual listing logo. No
payment logic or control state changed. Pull request `#25` then redesigned only
the public listing detail surface and its downloadable card, passed required CI
run `33872785916`, and squash-merged as exact commit
`397a037b508a9be240ee3f1446b11cb0ac225dfb`. Production deployment
`dpl_9Jd3WKBqZw7xA4RjVespCLyYMNE3` is READY on the apex and `www` aliases. Live
desktop and 390px mobile verification passed without horizontal overflow,
browser errors, or WCAG A/AA violations. Owner feedback then prompted a
rank-clarity and density refinement in pull request `#26`. Required CI run
`33880545146` and both Vercel checks passed; the pull request squash-merged as
exact commit `0bfd050115a79c3237ab5b9cfd94a1a0432bfc8e`. Production deployment
`dpl_BW43Ajkxf4gyrAc7Z8fx5mGEFLUu` is READY on the apex and `www` aliases.
Live inspection confirms that overall and Today's ranks are explicit and side
by side, the purchase target is a small separate estimate, sharing is above the
desktop fold, and the softened 1200×630 card renders correctly. The next action
is owner visual approval of pull request `#26`'s Production result; do not begin
another Phase 15 task from this gate. Dodo Test Mode and
the new Resend webhook target Production; two genuine signed Resend events
returned `200`, the old Preview webhook is disabled without deletion or
rotation, and repeated natural five-minute Cloudflare events plus the hourly
reconciliation event returned `200`. Do not create another Supabase project,
upgrade Vercel, use Dodo Live Mode, perform cleanup, run a real transaction,
issue refunds, or commercially launch.

The owner has now approved pull request `#26`'s Production presentation and
chosen to preserve one identical public listing surface for owners and visitors;
private owner actions remain under authenticated `/manage` routes. The next
launch-critical workstream is the remaining bounded, non-destructive Production
certification, beginning with still-outstanding monitoring/alert delivery,
Turnstile, Storage, backup-freshness, and rollback/pause evidence. This does not
authorize a Safety Control change, Dodo Live Mode, cleanup, a real transaction,
or commercial launch.

The owner subsequently authorized a focused public-homepage redesign and made
two explicit product decisions: clicking a listing card must continue through
the tracked `/go/[slug]` redirect directly to the listing's website, with no
separate `Visit website` button, and public leaderboard pages should show at
most 10 listings before stable cursor pagination. The implementation uses the
premium warm-neutral/burgundy presentation, a compact truthful hero,
one open-position invitation, four real recent movements, the existing manual
Refresh behavior, 10-listing repository defaults, and card-wide outbound links
while retaining separate details and takeover actions. Formatting, lint,
TypeScript, 23 focused unit tests, 8 public-read-model database tests, the
Next.js Production build, and focused desktop/390px Production-browser tests
passed before landing. No hosted data, payment/ranking logic, Safety Control,
or provider mode changed.

During visual review, the owner refined the card hierarchy: the whole card must
remain the dominant tracked website action, while listing detail is intentionally
secondary. The implementation therefore replaces the prominent `View
details` button with a quiet inline `See details` metadata link and changes the
public label from `tracked clicks` to `clicks` without changing collection,
deduplication, totals, or redirect behavior. Focused desktop/390px
Production-browser tests passed with no WCAG violations or horizontal overflow.

The homepage and join-overlay series landed through protected pull request
`#28`. Required `quality` CI run `33911327013` passed, both Vercel checks
passed, and the pull request squash-merged as
`3299fef13770f3ce7657ca0045a31540d9a30dbf` from feature commit
`cac7dfabe72598701cc259036c1cb360e6aded71`. Vercel Production deployment
`dpl_AFfg2NBdTCe6ZXeBd4n2qNVRPumj` is READY on `goneviral.in` from the merge.
The bounded live smoke passed the homepage, desktop acquisition and targeted
takeover overlays, deliberate close behavior, standalone `/join`, and the
390px full-height scrollable sheet without submitting a payment. The local and
remote default branch matched the merge with a clean worktree before this
documentation/evidence continuation. The next action is the remaining bounded,
non-destructive Production certification and naturally available Cloudflare
daily/failure/staleness evidence under the existing authorization boundaries.

The first bounded monitoring check confirms all four Production Sentry
configuration names, successful source-map/artifact-bundle upload for exact
release `3299fef13770f3ce7657ca0045a31540d9a30dbf`, and HTTP 200 ingestion of one
fixed synthetic PII-free Production certification event. On 2026-09-05 the
owner reported receiving the resulting Sentry email. That owner report closes
the genuine notification-delivery gate without recording the recipient,
subject, event URL, or payload; HTTP acceptance alone was not treated as
delivery evidence.

Production Turnstile is now certified from a read-only Cloudflare listing of
exactly one managed widget restricted to the apex/`www`, present Production-only
site key and secret configuration, live
Cloudflare script/container/action evidence on `/join`, the server's exact
success/action/hostname checks, and the already-certified ₹501 Production Test
Mode purchase that passed that boundary before checkout creation. No new
challenge, submission, hosted row, or payment was created for this recheck.

Production Storage is now certified with aggregate linked-project evidence:
both expected buckets exist, the public sanitized-logo bucket is public with
four objects, the staging bucket is private and empty, browser roles have zero
object SELECT/ALL policies, and one existing public WebP returned HTTP 200 from
Storage. No object path/body, private record, credential, or hosted mutation
was exposed or performed.

Backup staleness detection first reported a genuine blocker: the newest archive
was 108.38 hours old, outside the 24-hour baseline. The owner then ran
`pnpm ops:backup:hosted` in their own terminal and reported successful encrypted
archive verification. The resulting
`20260904T201904Z-fndssapjkaicxzeruuvv.7z` is tied to exact source commit
`3299fef13770f3ce7657ca0045a31540d9a30dbf`; an independent local check found
the archive and sidecar present, the recomputed SHA-256 matching, and zero
matching plaintext directories. Freshness therefore passes. Daily automated
backup cadence remains open because there is no GoneViral/Supabase scheduled
backup task. Codex did not launch the passphrase prompt, access backup contents,
prune archives, or receive/store the passphrase. The owner subsequently
reported copying only the archive and matching `.7z.sha256` to a private Google
Drive location while keeping the passphrase separately in the approved password
manager; no account, folder, link, or credential is recorded.

Rollback/payment-pause capability and procedure are now certified without a
live control change. Both the current PR `#28` Production artifact and earlier
known-good PR `#26` artifact are READY; the authenticated Vercel CLI exposes
targeted rollback and re-promotion and reports no rollback pending. The hosted
flags remain payments on/refunds off/read-only off/outbound links on. The
fresh-AAL2 `super_admin` control atomically records a reasoned
`payments_enabled=false` change and immutable audit while leaving signed inbound
events/reconciliation available; the disabled path and recovery path already
have staging/database evidence. No rollback, promotion, Safety Control, or
traffic state was changed for certification.

Cloudflare daily cadence is now certified by read-only provider analytics: the
natural `2026-09-04T02:43:08Z` scheduled invocation succeeded with zero Worker
errors and exactly two subrequests, matching the two fixed daily routes. All
331 invocations in the bounded Production window succeeded with zero runtime
errors. No real failure was naturally available, so genuine failure-notification
delivery remains pending; the current topology also lacks an independent owner-
visible missing-run detector and cannot alert on an invocation that never
occurred. No failure, route call, scheduler change, or redeployment was
manufactured for evidence.

The synchronized documentation and certification evidence passed formatting,
diff-integrity, sensitive-marker, required `quality` CI, and both Vercel checks.
Protected pull request `#29` squash-merged into the integration branch as
`ac89f8cf9ed752e76a7a5ff5750b790f9eb1c2b1`. The target was synchronized and
clean after the merge.

### Remaining Phase 15 gates

- Cloudflare failure-notification delivery and independent owner-visible
  stale/missing-run detection. Five-minute and hourly automatic cadence passed
  by owner report, and daily cadence passed from read-only provider analytics.
  Worker implementation, account/trigger/secret-name setup, reviewed guard
  change, and activated deployment are complete. The five manual
  protected-Preview route certifications are complete and need not be repeated
  merely because the scheduler changes.
- Optional deferred exhaustive visual/manual-device, keyboard,
  screen-reader/accessibility, hosted cropper/email edge-case, and safe hosted
  operational coverage recorded in the checkpoint. These are not current
  launch blockers absent a relevant new failure or owner risk decision.
- Vercel Pro purchase/configuration/cost-control evidence immediately before
  commercial launch; Hobby is temporarily accepted for non-commercial,
  production-shaped pre-launch testing.
- Continuing daily encrypted-backup cadence; the current fresh archive and
  checksum pass, but no GoneViral/Supabase scheduled backup task exists. The
  shared Supabase project remains an explicit owner exception to environment
  isolation.
- Current Dodo live status and exact live business/brand/product/credential/
  webhook/return/payout-bank verification. Merchant/KYC/business/bank/live
  capability is owner-confirmed; separate written approval is required only if
  Dodo requests it.
- The redacted public-address decision is complete, with the residual Rule 4(2)
  interpretation risk accepted by the owner. Verification of the Dodo merchant-
  of-record customer invoice plus Indian-business payout/
  reverse-invoice/GST/accounting evidence path. External lawyer and CA review
  are optional, not launch gates.
- Separately authorized pre-live cleanup of all synthetic/Test Mode business
  data, followed by proof that the board and financial ranking baseline are
  clean. Never delete arbitrary financial or ledger rows manually.
- Pre-live Preview contamination controls before Dodo Live Mode. Preview
  isolation after commercial launch may be completed as operational hardening.
- Separately authorized legitimate founder-owned low-value transaction and
  exact end-to-end reconciliation before payment enablement.

The exact sequence and provider-specific configuration inventory are in
`PHASE_15_PRODUCTION_LAUNCH_CHECKLIST.md`.
The address, GSTIN, invoice, and legitimate alternative-business-location
analysis is in `PHASE_15_GST_OPERATOR_AND_ADDRESS_RESEARCH.md`.

## Phase 16: only after launch

Follow the first-72-hours and first-30-days plan in the implementation plan.
Monitor financial exceptions, provider delivery, scheduler health, database
limits, backups, errors, email, abuse, latency, and costs. Tune or upgrade only
from evidence. Phase 16 is not a container for unfinished Phase 15 launch gates.

## Completion definition

GoneViral reaches 100% V1 completion only when:

- every applicable Phase 0–15 acceptance criterion is passed or has an explicit
  owner-approved risk disposition;
- all genuine provider/legal/accounting/infrastructure/security gates are
  recorded without fabrication;
- production is isolated and configured from the exact release commit;
- the release suite and minimal production smoke pass;
- the one authorized legitimate payment reconciles exactly once from provider
  through ledger, projections, board, email, and reconciliation;
- payments are enabled only after that evidence and explicit approval;
- the first-72-hours Phase 16 stabilization is completed with no unresolved
  critical financial/security issue;
- this plan, the Phase 15 checkpoint, runbooks, and Git history identify the
  exact deployed commit and remaining noncritical follow-up work.

## 2026-09-05 bounded pre-launch hardening candidate

This is not Phase 16 and does not authorize commercial launch. The current
candidate implements durable-then-immediate payment-success email delivery,
one-minute outbox recovery, five-minute operational health, one Sentry Free-plan
missing-run monitor, and the intercepted/shared How It Works modal and direct
page. Public copy calls the current-day view `Daily`, retains `/today` for link
compatibility, and distinguishes non-resetting all-time ranking from the daily
midnight-IST reset. Local focused code, database, Worker, accessibility, desktop, and mobile
checks pass; full CI, deployment, natural Cloudflare execution, and hosted
monitor evidence remain the next gates. Daily automated backup remains deferred
for the documented security/runtime reasons; the verified manual encrypted
backup process remains authoritative. See
`TRANSACTIONAL_EMAIL_OPERATIONS.md`,
`CLOUDFLARE_SCHEDULED_OPERATIONS.md`,
`OBSERVABILITY_SECURITY_AND_FAILURE_DRILLS.md`, and the Phase 15 checkpoint.

## Fresh-task protocol

A fresh task should read, in order:

1. `AGENTS.md`;
2. this master plan;
3. `PHASE_15_STAGING_CURRENT_STATE.md`;
4. the active scope's authoritative specifications/runbooks.

The task must begin from the recorded next task, inspect current branch/commit/
worktree, preserve unrelated owner changes, and avoid repeating settled checks.
After a coherent workstream, update this file and the checkpoint, commit it
separately when appropriate, and provide a delta-only continuation prompt.

## 2026-09-04 homepage visual-hierarchy decision

The owner approved the focused homepage polish while preserving the existing
product and interaction decisions. The implementation uses a compact premium
hero with the public-sponsored-leaderboard eyebrow,
`Get listed` acquisition wording, a truthful `Live leaderboard` heading paired
with the exact freshness timestamp and manual refresh, grouped board/category
filters, and a denser 1180px leaderboard. The first three rank markers are gold,
silver, and bronze; number one receives a restrained laurel/leader treatment.
A `Top 3` boundary appears only when a lower-ranked listing follows, and a
`Top 20` boundary appears only when the board actually continues beyond rank 20. Recent movements and the footer received the same visual hierarchy pass.

The whole card still opens the submitted website through tracked `/go/[slug]`,
while `See details` and `Take #...` remain independently operable. Public click
totals, ten-item stable cursor pagination, ranking, payment, tracking, privacy,
security, and business logic are unchanged. Formatting, lint, TypeScript, 23
focused unit tests, the Production build, and four focused desktop/mobile
Production-browser scenarios pass. The captured desktop and 390px review
artifacts are under `artifacts/homepage-polish-2026-09-04/`. At that review
point, Production and all hosted state remained unchanged; the final approved
series later landed and deployed through pull request `#28` as recorded above.

The owner rejected the first polish as still over-explained and directed an
Outbid-inspired density pass without copying Outbid's identity. Live desktop
and 390px reference inspection established the responsive rule: only the
category rail scrolls horizontally; leaderboard and Recent Moves remain compact
vertical rows. The homepage removes the repeated trust/disclosure
copy from the masthead, uses a lightweight How it works link, shortens the hero,
replaces the mobile Menu label with an accessible icon, removes control-label
clutter, gives all three podium ranks one matching laurel family and restrained
tonal surfaces, composes mobile cards into intentional identity and spend/action
rows, and compacts the activity/footer treatment. At 390×844, rank #1 begins at
about 531px; the page and Recent Moves have no horizontal overflow. Ranking,
payments, tracked `/go/[slug]`, public clicks, details, takeover quotes, activity
data, cursor pagination, security, database, and hosted state are unchanged.
Formatting, lint, TypeScript, 23 focused unit tests, the Production build, and
focused 1440px/390px browser checks pass. The new review captures are under
`artifacts/homepage-refinement-2026-09-04/`.

A subsequent bounded population-state correction now uses the existing
minimum-payment rank projection for the homepage acquisition row, suppresses
Recent Moves when no genuine movement exists, and distinguishes an exhausted
cursor page from a genuinely empty board. The projection remains explicitly
non-guaranteed and falls back to rank-neutral copy on failure. Focused unit
coverage and TypeScript pass; ranking, payment, database schema, hosted state,
and Production remain unchanged.

## 2026-09-05 join overlay decision

The owner authorized a presentation-only continuation of the existing public
join flow. Client-side `Get listed` and `Take #...` navigation now presents the
unchanged join form in an intercepted desktop dialog or mobile full-height
sheet, while direct visits and refreshes at `/join` retain the standalone page.
The target slug, current takeover quote, server validation, Dodo adapter,
Turnstile path, idempotency, listing creation, ranking, and ownership behavior
remain unchanged.

The overlay locks background scroll, makes the board inert, traps and restores
focus, ignores backdrop interaction, and exposes only deliberate desktop or
mobile close controls. Any entered change causes close, desktop Escape, and
Browser Back to show a keep-editing/discard confirmation; untouched forms close
without prompting. Focused TypeScript, lint, nine join-domain unit tests, and
local desktop/390px browser scenarios pass, including direct `/join`, target
pricing, Back/close safety, no horizontal overflow, and a valid modal submission
to deterministic local mock checkout. Review captures are under
`artifacts/join-overlay-2026-09-05/`. At approval time no hosted data, provider
configuration, Safety Control, or Production state had changed. The approved
implementation later landed through pull request `#28`, passed required CI,
squash-merged as `3299fef13770f3ce7657ca0045a31540d9a30dbf`, deployed READY
to Production, and passed the bounded live smoke recorded above.
