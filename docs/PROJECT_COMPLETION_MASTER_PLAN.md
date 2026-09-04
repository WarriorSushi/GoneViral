# GoneViral project completion master plan

Last updated: 2026-09-04 (Asia/Kolkata)

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

| Scope                                      | Status                                 | Evidence/source                                       |
| ------------------------------------------ | -------------------------------------- | ----------------------------------------------------- |
| Phases 0–14                                | Complete                               | Git history and phase documents under `docs/`         |
| Phase 15 risk-based private staging        | Frozen Preview RC; lifecycle verified  | `PHASE_15_STAGING_CURRENT_STATE.md`                   |
| Phase 15 isolated backup remediation       | Complete                               | restore and 66/66 database evidence in the checkpoint |
| Phase 15 staging scheduler                 | 5m/hourly passed; daily pending        | `CLOUDFLARE_SCHEDULED_OPERATIONS.md`                  |
| Public-repository content audit            | Passed; owner already made repo public | `PHASE_15_STAGING_CURRENT_STATE.md`                   |
| Public-repository settings hardening       | Complete                               | `PHASE_15_STAGING_CURRENT_STATE.md`                   |
| Phase 15 production-shaped pre-launch gate | Authorized; configuration in progress  | checkpoint exact resume point                         |
| Commercial Production launch               | Not authorized/not complete            | Phase 15 runbook                                      |
| Phase 16                                   | Not started                            | implementation plan                                   |

Current working branch: `codex/phase-15-founder-console-evidence`; merge target:
`codex/phase-15-staging`.

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
- Scheduler cadence compromise: email outbox every five minutes; operational
  health every five minutes; reconciliation hourly; cleanup daily. Delayed or
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

Have the owner visually review the guidance-first founder console now served by
READY Production deployment `dpl_Adn8YtBDGEiqVDmXbENmq1uZ8i7q` from exact
merged commit `00c90b1c6fb03decb50667e65caaea7fea82840b`, then use its plain-
language, authenticated admin/AAL2 control to enable only the database
`payments_enabled` flag. Run the remaining narrow Production smoke and one
synthetic Dodo Test Mode purchase. Dodo Test Mode and the new Resend webhook
target Production; two genuine signed Resend events returned `200`, the old
Preview webhook is disabled without deletion or rotation, and repeated natural
five-minute Cloudflare events plus the hourly reconciliation event returned
`200`. Do not create another Supabase project, upgrade Vercel, use Dodo Live
Mode, perform cleanup, run a real transaction, issue refunds, or commercially
launch.

### Remaining Phase 15 gates

- Cloudflare daily cadence and remaining failure/staleness certification.
  Five-minute and hourly automatic cadence passed by owner report. Worker
  implementation, account/trigger/secret-name setup, reviewed guard change,
  and activated deployment are complete. The five manual protected-Preview
  route certifications are complete and need not be repeated merely because
  the scheduler changes.
- Optional deferred exhaustive visual/manual-device, keyboard,
  screen-reader/accessibility, hosted cropper/email edge-case, and safe hosted
  operational coverage recorded in the checkpoint. These are not current
  launch blockers absent a relevant new failure or owner risk decision.
- Vercel Pro purchase/configuration/cost-control evidence immediately before
  commercial launch; Hobby is temporarily accepted for non-commercial,
  production-shaped pre-launch testing.
- Production-specific Vercel environment, DNS/TLS, `goneviral.in`, Supabase
  Auth URLs, email authentication, webhook URLs, secrets, monitoring, alerts,
  backup cadence, scheduler target, and rollback verification. The shared
  Supabase project is an explicit owner exception to environment isolation.
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
