# Phase 15 budget-constrained launch plan

Last updated: 2026-09-02 (Asia/Kolkata)

## Owner decisions

- Use Supabase Free initially. The owner accepts no managed PITR, weaker
  provider recovery guarantees, possible inactivity pause, dependence on
  GoneViral's encrypted backup procedure, and possible recovery downtime.
- Use GitHub Actions scheduled workflows for the initial production scheduler.
  The owner authorizes making the repository public after a complete current-
  tree and Git-history secret audit passes. No repeated confirmation is needed
  if the audit is unambiguously clean; stop if any exposure is found or unclear.
- Accept a five-minute email-outbox cadence instead of one minute. Accept that
  GitHub scheduled workflows may occasionally be delayed or dropped; durable,
  idempotent workers must catch up on the next run.
- Do not use the owner's existing VPS; it is reserved for OTTR.
- Use Vercel Pro for a commercial GoneViral launch when the owner is ready to
  purchase it. Vercel Hobby remains private-preview/development only because
  its published terms prohibit commercial payment use.
- Upgrade Vercel or Supabase further only after measured traffic, reliability,
  or revenue justifies it. No purchase, production deployment, domain change,
  live credential, or live payment is authorized by this plan alone.

## GitHub Actions scheduler design

The public-repository allowance removes hosted-runner minute charges for
standard runners, but it does not improve scheduler precision. GitHub's
five-minute minimum, default-branch-only execution, load delays/drops, and
automatic schedule disablement after 60 days of no public-repository activity
are accepted constraints.

Use one dedicated workflow with `schedule` and `workflow_dispatch`. It must
invoke the existing authenticated HTTPS routes without moving business logic
into workflow YAML:

| Route                                | Initial cadence | Failure behavior                                 |
| ------------------------------------ | --------------- | ------------------------------------------------ |
| `/api/cron/drain-email-outbox`       | every five min  | durable rows remain queued and catch up next run |
| `/api/cron/check-operational-health` | every five min  | next run detects persisted conditions            |
| `/api/cron/reconcile-payments`       | hourly          | bounded lookback catches delayed/missed events   |
| `/api/cron/cleanup-logo-assets`      | daily           | next daily/manual run catches expired assets     |
| `/api/cron/cleanup-retention`        | daily           | next daily/manual run catches expired records    |

Required controls:

- keep `CRON_SECRET` only in GitHub Actions Secrets and the hosting platform's
  encrypted environment; never commit, echo, interpolate into logs, or accept
  it from pull-request content;
- grant workflow permissions `contents: read` only;
- pin every third-party Action to a full commit SHA;
- never use `pull_request_target` for the scheduler;
- use fixed route names and a fixed approved base URL, strict HTTPS, bounded
  connect/total timeouts, fail on non-2xx, and log only route/status/timing;
- prevent overlapping workflow runs with one concurrency group;
- keep route-level database/advisory locking and idempotency as the real
  duplicate-run protection;
- expose manual dispatch for recovery and certify every route independently;
- enable GitHub workflow-failure notifications and add an owner-visible check
  for stale/missing scheduler execution;
- after 60 days without repository activity, explicitly verify that GitHub has
  not disabled the public-repository schedule.

Implementation status on 2026-09-02: commit
`3b6e8a8327ecadbf1242b2ba8114d7a228e1c9d1` adds the inert-by-default workflow,
fixed runner, and focused verification. The complete configuration and
certification procedure is in `GITHUB_SCHEDULED_OPERATIONS.md`. No hosted
secret/variable, route call, or deployment was made.

Protected Preview support was added in
`a6bc5289a7a0b9dd9222ae6ba9bc332d81b30109`. The workflow now reads the Vercel
automation-bypass value from GitHub Actions secret
`VERCEL_AUTOMATION_BYPASS_SECRET` and sends it only as the
`x-vercel-protection-bypass` header. It remains inert unless the existing
repository-variable guard is exact lowercase `true`; no hosted configuration
or request was made by this patch.

Activation evidence on 2026-09-02: after explicit owner authorization, the
guard was set to exact lowercase `true` for the protected non-production
Preview. All five independent manual operations returned HTTP 200 with
route/status/timing-only logs, and a credential-free request was denied by
Vercel Deployment Protection. GitHub created no automatic `schedule` event
during the bounded 16:00-16:23:43 UTC observation window, even after the active
workflow registration was refreshed. Manual route certification therefore
passed, while automatic cadence, failure/staleness notification, and 60-day
disablement evidence remain open. Sanitized run IDs and results are in
`GITHUB_SCHEDULED_OPERATIONS.md`.

Official references:

- <https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule>
- <https://docs.github.com/en/billing/concepts/product-billing/github-actions>
- <https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions>

## Public repository gate

Making the repository public is a separate external-state change. Before it:

1. scan the complete reachable Git history, current tree, tags, and workflow
   files for credentials and sensitive artifacts;
2. inspect ignored/untracked files only to prove they will not be published;
3. remove and rotate any exposed credential before visibility changes;
4. verify no backup, `.env`, provider payload, customer data, magic link,
   database URL, secret, or private evidence is tracked anywhere in history;
5. verify branch protections and workflow permissions prevent untrusted pull
   requests from receiving secrets;
6. record the sanitized result, then use the owner's authorization above to
   change visibility; stop instead if any secret exposure is found or unclear.

Source code, schemas, tests, route names, and architecture are not secrets.
Authentication, authorization, provider signatures, database grants, and
secret storage must remain secure even when all code is public.

## Supabase Free recovery posture

The corrected Phase 15 encrypted backup contains application, Auth, Storage,
managed migration-history, role-membership, and object state. Its isolated
restore, Auth/Storage startup, integrity checks, and 66/66 database suite passed.
Do not repeat that certification without a relevant change.

Once live, create and verify an encrypted off-device backup at least daily,
before every migration/high-risk release, and after a material recovery change.
The 24-hour baseline RPO is an operational target, not a guarantee. Add stale-
backup monitoring and retain the documented isolated restore procedure. A
future daily GitHub backup workflow is separate work and may proceed only if
credentials and the archive passphrase can be consumed non-interactively
without appearing in arguments, logs, artifacts, repository files, or chat.

Official references:

- <https://supabase.com/pricing>
- <https://supabase.com/docs/guides/platform/free-project-pausing>
- <https://supabase.com/docs/guides/platform/backups>

## Vercel Pro cost boundary

Vercel Pro is currently advertised at US$20 per month with one deploying seat
and US$20 of included usage credit. The final card charge is not a fixed INR
amount: taxes and card/foreign-exchange charges may apply. Additional deploying
seats, Marketplace integrations, and add-ons are separate fixed charges.
Metered usage beyond included allocations/credit is billed on demand.

The owner requires no intentional on-demand spending. Before the first Pro
production deployment:

1. keep exactly one paid deploying seat and use free Viewer seats otherwise;
2. inventory every project in the Pro team because usage and the spend action
   are team-wide; move or archive unnecessary projects;
3. enable no Marketplace integration or paid add-on;
4. change the default on-demand budget to the lowest value Vercel permits;
5. explicitly enable **Pause production deployments** at that amount;
6. enable web/email alerts at 50%, 75%, and 100%, plus SMS at 100%;
7. verify the settings after purchase and record sanitized evidence before
   attaching `goneviral.in` or enabling payments.

This is the strongest available Vercel control, not a mathematical guarantee
of an exact US$20 invoice. Vercel documents that spend is checked every few
minutes and that Spend Management excludes seats, integrations, and add-ons.
If an invoice of exactly the base fee with zero possible excess is a strict
requirement, Vercel Pro does not satisfy that requirement and production must
remain blocked until the owner accepts the residual risk or chooses a genuinely
fixed-price host.

Official references:

- <https://vercel.com/docs/plans/pro-plan>
- <https://vercel.com/docs/spend-management>
- <https://vercel.com/docs/pricing/understanding-my-invoice>

## Sequential next work

1. Completed: implement and locally test the GitHub scheduler workflow without
   secrets, hosted changes, or route calls; use the five-minute email cadence.
2. Completed after the owner's visibility change: audit the complete reachable
   history, fetched public refs, current tree, workflows, tags, and unpublished
   ignored state. The sanitized clean result is in the Phase 15 checkpoint.
   Codex did not change repository visibility.
3. Completed through inert configuration: secret scanning/push protection,
   read-only workflow permissions, restricted SHA-pinned Actions, and an active
   no-bypass default-branch PR/strict-CI ruleset are configured. The two
   expected GitHub secret names and the base-URL variable name are present. No
   secret value was disclosed or read.
4. Partially completed after fresh explicit authorization: the exact lowercase
   enable variable is present and every manual protected-Preview operation
   passed. Automatic five-minute/hourly/daily cadence and failure/staleness
   behavior remain unverified because GitHub emitted no scheduled event during
   the bounded observation window.
5. Complete only the remaining owner-selected Phase 15 visual/accessibility and
   hosted operational checks; do not repeat settled database, restore, or E2E
   evidence without an invalidating change.
6. Resolve the genuine provider, KYC/bank, counsel, accounting/GST/invoice,
   domain/email, security/access, alerting, and production-isolation gates.
7. When the owner is ready, purchase/configure Vercel Pro with the cost controls
   above. Production remains payments-off until the exact release suite and
   minimal production smoke pass.
8. Request separate immediate authorization before the one legitimate founder-
   owned live transaction, before enabling payments/refunds, and before
   destructive prelaunch cleanup.
9. Begin Phase 16 only after a completed launch. Upgrade plans or architecture
   only from measured traffic, incidents, limits, or revenue.
