# GoneViral project completion master plan

Last updated: 2026-09-02 (Asia/Kolkata)

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

| Scope                                           | Status                                    | Evidence/source                                       |
| ----------------------------------------------- | ----------------------------------------- | ----------------------------------------------------- |
| Phases 0–14                                     | Complete                                  | Git history and phase documents under `docs/`         |
| Phase 15 risk-based private staging             | Critical path complete                    | `PHASE_15_STAGING_CURRENT_STATE.md`                   |
| Phase 15 isolated backup remediation            | Complete                                  | restore and 66/66 database evidence in the checkpoint |
| Phase 15 production scheduler                   | Protected-Preview implementation complete | `GITHUB_SCHEDULED_OPERATIONS.md`                      |
| Public-repository content audit                 | Passed; owner already made repo public    | `PHASE_15_STAGING_CURRENT_STATE.md`                   |
| Public-repository settings hardening            | Complete                                  | `PHASE_15_STAGING_CURRENT_STATE.md`                   |
| Phase 15 exhaustive/manual and production gates | Incomplete/deferred                       | checkpoint exact resume point                         |
| Production launch                               | Not authorized/not complete               | Phase 15 runbook                                      |
| Phase 16                                        | Not started                               | implementation plan                                   |

Current branch: `codex/phase-15-staging`.

The budget-plan commit pushed before scheduler implementation was
`28378def9f6a19f27129eecb244aec5c6695cf47`.

## Locked current owner decisions

- Initial database/Auth/Storage plan: Supabase Free, with explicit acceptance
  of no managed PITR, possible inactivity pause, self-managed backup dependence,
  weaker recovery guarantees, and possible recovery downtime.
- Initial scheduler: GitHub Actions. The owner made the repository public before
  this continuation; the subsequent complete content/history audit passed, and
  Codex did not change visibility.
- Scheduler cadence compromise: email outbox every five minutes; operational
  health every five minutes; reconciliation hourly; cleanup daily. Delayed or
  dropped scheduled runs catch up through durable/idempotent workers.
- Existing VPS is reserved for OTTR and is out of scope for GoneViral.
- Commercial Vercel launch requires Pro under current Vercel terms. Purchase
  timing remains with the owner. Configure strongest cost controls and disclose
  that Vercel cannot guarantee an exact fixed INR or US$20 final invoice.
- Upgrade Supabase/Vercel further only after measured traffic, reliability need,
  or revenue justifies it.
- No production deployment, domain attachment, live credential/payment/refund,
  destructive cleanup, or Phase 16 without its fresh explicit authorization.

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
- Owner selection of Supabase Free risk posture and GitHub Actions scheduling.
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
  the owner without value disclosure; the enable variable remains absent and
  no hosted scheduler run occurred.
- Secret scanning/push protection, restricted SHA-pinned Actions, read-only
  workflow permissions, and an active no-bypass default-branch PR/strict-CI
  ruleset configured and verified.
- Fresh-run CI route-type prerequisite fixed by running `next typegen` before
  TypeScript; required pull-request `quality` run `33649828937` passed the full
  format/lint/typecheck/test/build/security/audit pipeline.

Exact sanitized evidence and commits are in
`PHASE_15_STAGING_CURRENT_STATE.md`. Preserve the existing staging shutdown.

### Next task

Keep the enable guard absent/non-`true`. Only after fresh explicit authorization,
create the exact lowercase enable variable, certify each manual protected-
Preview route, and then observe the five-minute, hourly, and daily automatic
cadences plus failure/staleness behavior. Do not deploy production or use live
credentials.

### Remaining Phase 15 gates

- GitHub repository hardening, scheduler secret/configuration, and
  non-production manual/automatic schedule certification.
- Owner-selected deferred exhaustive visual/manual-device, keyboard,
  screen-reader/accessibility, hosted cropper/email edge-case, and safe hosted
  operational coverage recorded in the checkpoint.
- Production host purchase/configuration and Vercel cost-control evidence.
- Production-specific project isolation, region, environment, DNS/TLS,
  `goneviral.in`, Supabase Auth URLs, email authentication, webhook URLs,
  secrets, monitoring, alerts, backup cadence, and rollback verification.
- Genuine Dodo model approval, KYC/entity/bank/live credentials.
- Genuine counsel and CA approval of legal/privacy/refund/content/grievance and
  GST/invoice/accounting/place-of-supply obligations.
- Authorized prelaunch cleanup, if still required by the runbook.
- Full release suite on the exact candidate commit.
- Separately authorized minimal payments-off production smoke.
- Separately authorized legitimate founder-owned low-value transaction and
  exact end-to-end reconciliation before payment enablement.

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
