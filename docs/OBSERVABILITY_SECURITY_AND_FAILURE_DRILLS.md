# Observability, security, and failure drills

## Authority and provider boundary

PostgreSQL's immutable ledger remains GoneViral's financial authority and only
authenticated server-to-server payment state can change it. Dodo Payments is
the current payment provider behind replaceable checkout, webhook,
reconciliation, adjustment, and refund adapters. Observability, email, cache,
storage, browser callbacks, and health endpoints have no rank or money
authority. A future payment provider may replace Dodo through the same adapter
and ledger contracts.

## Sentry and structured telemetry

The pinned `@sentry/nextjs` SDK initializes in the Next.js Node, Edge, and
browser instrumentation entry points only when `NEXT_PUBLIC_SENTRY_DSN` is
configured. `sendDefaultPii` is false. Browser Session Replay is disabled.
Production trace sampling is deliberately low and must be reviewed against
traffic and retention before launch.

Every Sentry event and breadcrumb passes the shared scrubber. The same scrubber
protects JSON application logs. It removes sensitive-shaped keys including
authorization, cookies, email, phone, IP fingerprints, provider payment/event
references, secrets, signatures, raw bodies, internal notes, and report text.
It also removes emails, phone numbers, bearer credentials, URL credentials,
queries, and fragments found inside free-form strings. Error logs use an error
class/name and fixed safe code, never an exception message that may contain a
connection string or provider payload.

External Route Handlers assign or accept a syntax-bounded `X-Request-ID` and
return it to the caller. Logs correlate with that request ID plus safe public
attempt/listing/outbox IDs where needed. Never use a provider payment ID, email,
raw IP, destination query, magic-link URL, or webhook body as correlation data.

Hosted Sentry setup requires:

```text
NEXT_PUBLIC_SENTRY_DSN=<intentionally public project DSN>
SENTRY_AUTH_TOKEN=<build-only organisation token>
SENTRY_ORG=<organisation slug>
SENTRY_PROJECT=<project slug>
```

Source-map upload is enabled only when all three build-only settings are
present. The build deletes uploaded maps. Without them, Sentry source-map work
is disabled and the client-build verifier requires that no public `.map` file
exists. Configure Sentry's server-side default scrubbers, IP-address removal,
access/retention policy, issue ownership, and alert destinations as a second
layer. A local successful build does not prove a Sentry project, upload, event,
or alert exists.

The authenticated email-outbox cron route uses the existing Sentry project as
an independent Cron Monitor when the Production DSN is present. It records an
`in_progress` check-in only after cron authentication, then records `ok` or
`error` with bounded SDK flush. The monitor expects `* * * * *` in UTC, allows
three minutes of check-in margin and one minute of runtime, opens an issue on
the first failure or miss, and requires two successes for recovery. Sentry
errors cannot fail the outbox route. This is deliberately the single Free-plan
monitor: it detects absence of the highest-frequency delivery-recovery path
without pretending that Cloudflare can watch itself or consuming paid monitor
capacity. Hourly reconciliation and daily cleanup retain their existing safe
failure telemetry but do not each get a separate missing-run monitor on the
current free plan.

Official references:

- Sentry Next.js setup: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
- Sentry filtering: https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/filtering/
- Next.js response headers: https://nextjs.org/docs/app/api-reference/config/next-config-js/headers
- Next.js CSP guide: https://nextjs.org/docs/app/guides/content-security-policy

## Operational metrics and alerts

The authenticated `/api/cron/check-operational-health` route runs every five
minutes under the selected scheduler. It returns aggregates only and emits
safe structured/Sentry alerts. It never returns row IDs, owner data, rate-limit
subject HMACs, provider payment references, or raw payloads.

Before collecting those metrics, the authenticated route atomically changes
only elapsed `checkout_ready`, `customer_returned`, or `provider_pending`
attempts to local `expired`. This is idempotent maintenance, not provider-
failure evidence: it stops checkout reuse and stale polling, and an authentic
late provider success may still supersede the local expiry. Stale pre-checkout
states remain alerts for investigation rather than being silently expired.

Current signals are:

| Signal                                  | Alert rule    | Severity |
| --------------------------------------- | ------------- | -------- |
| lifetime/daily projection mismatch      | any           | critical |
| new quarantined provider event in 24 h  | any           | critical |
| open reconciliation item                | any           | warning  |
| dead-letter email                       | any           | warning  |
| payment attempt pending over 30 minutes | any           | warning  |
| email backlog                           | over 100 rows | warning  |

The admin dashboard separately shows aggregate active rate-limit scopes,
bucket counts, observed actions, and expiry. Tune limits from measured abuse;
do not expose subject fingerprints or weaken Turnstile, server validation,
owner/admin authorization, or provider signatures.

Hosted alert rules must additionally cover route 5xx rate, Dodo webhook silence
relative to provider activity, cron failures/missed invocations, database
connections/locks, function duration, Sentry error rate, Supabase availability,
and Vercel spend/traffic anomalies. These need real hosted traffic and cannot be
certified locally.

Code/configuration presence, local mock proof, deployed check-ins, a deployed
synthetic failure, and an owner-received notification are separate evidence
levels. Never infer the latter levels from the former.

The pre-launch failure drill used a temporary isolated path only. At
`2026-09-04T22:40:59Z`, its single natural Cloudflare event reached the
temporary internal endpoint, received the deliberate `503`, logged only
`synthetic_scheduler_certification status=503`, and finished as a failed
scheduled invocation. Vercel then recorded only the fixed PII-free application
event with `sentryFlushed: true`. This proves the scheduler-to-application
failure path and successful SDK flush. The owner subsequently confirmed receipt
of the expected Sentry email, closing the owner-visible notification gate
without storing recipient or message details. The disposable Worker had no
public route, business credentials, storage, or other schedule and could not
read or mutate payment, listing, email, Supabase, Dodo, Resend, or cleanup
state. It and its one-time secret were deleted immediately after the event, and
Cloudflare now reports that the Worker does not exist. The second and final
bounded pull request removes the temporary endpoint, verifier, Worker source,
and focused tests from the application repository.

The selected Cloudflare Worker's fixed route map, safe logs, disabled guard,
activation boundary, and missing-run limitation are documented in
`CLOUDFLARE_SCHEDULED_OPERATIONS.md`. The retired GitHub scheduler remains
historical evidence in `GITHUB_SCHEDULED_OPERATIONS.md`.

## Health endpoints

- `/api/health/live` proves only that the Next.js process can answer.
- `/api/health/ready` performs a minimal database read and returns only
  `ready` or `unavailable`.

Both are no-store and carry a request correlation ID. Neither exposes versions,
configuration, regions, table names, errors, credentials, queue counts, or
customer data. Count-bearing operational metrics remain cron-secret protected.

## Browser security policy

All responses receive CSP, HSTS, no-sniff, frame denial, strict referrer,
permissions, opener/resource, and cross-domain-policy headers. The CSP has
explicit origins for the application, configured Supabase origin, configured
Sentry ingest origin, and Cloudflare Turnstile. It denies plugins, foreign base
URLs, framing, arbitrary form destinations, camera, microphone, geolocation,
payment-request, USB, and browsing-topics access.

Next.js currently requires inline script/style compatibility for the selected
static/partially-prerendered architecture, so the policy uses `unsafe-inline`
for scripts/styles. It does not allow a wildcard and production does not allow
`unsafe-eval`. Moving to per-request nonces would force dynamic rendering and
must be evaluated as an explicit cache/performance architecture change. Hosted
Dodo checkout is a top-level navigation; no Dodo script or iframe is permitted
inside GoneViral pages.

The enforced policy must be rechecked in hosted staging with Turnstile,
Supabase Auth, sanitized Supabase Storage logos, Sentry delivery, Dodo return
navigation, and all browsers. Local mock flows cannot prove those origins.

## Secret rotation

Record the incident/change ID, owner, start/end time, environments, old-key
revocation evidence, smoke results, and rollback decision. Never put secret
values in tickets, commits, logs, screenshots, or chat.

1. Use payments-off for Dodo credential/webhook work; allow already-authoritative
   events to retry once the new verification key is active. Coordinate provider
   webhook-key overlap if Dodo supports it. Reconcile before re-enabling.
2. Rotate Resend API and webhook keys, verify signed delivery events, then drain
   the existing outbox. Email outage must not pause ledger commits.
3. Rotate `CRON_SECRET` atomically with the hosting scheduler and verify every
   authenticated cron returns success.
4. Rotate Supabase secret/database credentials through a staged pool rollout;
   confirm readiness and connection drain before revocation. Publishable keys
   are not authorization boundaries, but still follow platform guidance.
5. Rotate `PRIVATE_DATA_ENCRYPTION_KEY` by moving the old value to
   `PRIVATE_DATA_ENCRYPTION_KEY_PREVIOUS`, installing a new 32-byte current key,
   re-encrypting retained private envelopes through a reviewed one-off
   procedure, verifying counts/decryption, then removing the previous key. New
   envelopes always use current; reads allow only the explicit previous key.
6. Click HMAC already supports current/previous overlap. Keep the old key for
   the dedupe window, then remove it. Rotate submission/rate HMAC with awareness
   that current buckets will naturally expire.
7. Rotate Sentry build tokens separately from the public DSN and confirm maps
   are uploaded/deleted by an actual hosted build.

## Failure-drill expectations

| Drill                                                 | Required safe result                                                                                       |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| database unavailable during signed Dodo webhook       | 503/no acknowledgement; provider retry later applies once                                                  |
| ambiguous Dodo create timeout                         | attempt stays pending; no automatic second Dodo create                                                     |
| email provider down                                   | ledger/admin commit remains; one outbox row backs off then dead-letters visibly                            |
| cache invalidation throws after fulfilment            | webhook acknowledges committed money; DB/confirmed page remains true; cache expires/repairs                |
| logo storage down                                     | listing/payment remains usable; current logo/value is unchanged; upload can retry                          |
| duplicate/replay/out-of-order provider storm          | signature and semantic checks run; one fulfilment/transition per durable identity                          |
| malicious URL/upload/XSS/IDOR/admin bypass/CSRF input | rejected at canonicalization, sanitizer, schema, ownership, role, origin/framework, or signature boundary  |
| payments-off/read-only                                | new financial or mutation entry is blocked while authoritative inbound/reconciliation history remains safe |

Automated tests exercise these results with deterministic mocks and real local
PostgreSQL concurrency. Before production, repeat the drills in isolated
staging, inspect actual Sentry/log/alert evidence, and run a provider-approved
Dodo test-mode matrix. Never load-test a live payment endpoint without written
approval.

## Backup and restore rehearsal

Use a non-production Supabase project or an isolated local database. Record
source migration version, dump checksum, start/end time, restore target, row
counts, ledger/projection verification, and recovery time. Restore into a new
empty target; never overwrite a database that may contain newer provider
transactions.

After restore run:

```text
pnpm db:migrations:verify
node scripts/db/verify-schema.mjs
pnpm test:database
pnpm db:lint
pnpm db:advisors
```

Then compare ledger sums, daily sums, provider/payment identities, audit/event
append-only triggers, and operational metrics. Code may roll back; confirmed
financial history never does. A local rehearsal is not evidence of hosted PITR,
backup retention, RPO, or RTO.

`pnpm ops:rehearse-restore` provides a narrower, non-destructive local check. It
opens a repeatable-read snapshot, copies ten critical financial/operational
tables into connection-local temporary restore tables, and proves exact row
counts plus deterministic whole-row fingerprints before transaction end. It is
restricted to local port 54322 and never logs row contents. This checks logical
snapshot restorability while the current machine lacks PostgreSQL dump/restore
executables; it does not replace a real Supabase backup/PITR restore into a new
hosted project.

For the linked hosted project, `pnpm ops:backup:hosted` creates separate role,
scoped custom-role-membership, `app`/`private` and managed `auth`/`storage`
schema/data dumps, Auth/Storage managed migration history, application migration
schema/data history, configuration, and both actual Storage bucket exports under
`D:\GoneViral-Backups`. The managed-history export is deliberately limited to
`auth.schema_migrations` and `storage.migrations`; the membership export is
limited to the required `goneviral_app -> postgres` grant. Supabase platform
roles and unrelated system catalogs are not copied. The installed CLI's linked
Storage copy command is currently unsupported, so the script retrieves the
modern secret key only into process memory and downloads objects through the
supported Storage API without printing or persisting the credential. It records
per-file checksums and source identity, asks 7-Zip for a passphrase without
accepting it on the command line, verifies the encrypted archive, writes an
external SHA-256 evidence file, and only then removes plaintext. The passphrase
must be stored in an approved password manager, never chat, shell history, the
repository, or the backup directory.
For an off-device copy, upload only the resulting `.7z` and matching
`.7z.sha256` to a private account; never upload the plaintext timestamp folder
or SQL files.
`-PruneExpired` requires a second typed confirmation and removes only matching
encrypted archives older than the configured rolling period.

Daily automation is intentionally deferred on the present free architecture.
The proven job requires an interactive 7-Zip passphrase, native PostgreSQL and
archive tooling, temporary local plaintext, and an authenticated private Drive
destination. Cloudflare Workers cannot run that toolchain within its runtime;
Vercel Hobby is not a durable archive host; the existing Google Drive copy has
no approved unattended service identity; and keeping the owner's desktop
running would not be autonomous. Moving the passphrase into an unsafe script or
adding a paid runner/storage service would weaken the certified process. The
manual encrypted archive, checksum, separate passphrase, and private off-device
copy therefore remain valid while scheduling stays a tracked pre-launch
operational follow-up.

For restore, initialize a disposable target with the PostgreSQL image recorded
in the format-v2 manifest so platform roles and bootstrap grants exist. Stop its
Auth/Storage writers, restore the scoped role/membership, schemas, normal data,
managed migration history, and application migration history with stop-on-error,
then start Auth and Storage. Certification requires both services to become
healthy without attempting an already-recorded migration; matching non-zero
Auth/Storage history counts and database boot alone are insufficient. Restore
the archived Storage payloads into that isolated backend and checksum the files
through the service before running the post-restore commands above.

For the local file backend, preserve the Storage service's tenant/project
namespace in addition to `<bucket>/<object-key>/<version>`; the current isolated
CLI stack uses `stub/stub`, so its volume path begins
`/mnt/stub/stub/<bucket>/...`. Derive and verify this namespace from the
disposable service configuration instead of assuming that files live directly
under `/mnt`.

Do not invoke `pnpm test:database` directly against a restored snapshot. Its
fixture lifecycle intentionally replaces broad local test data. Use
`pnpm test:database:isolated-restore -- --workdir
<absolute-disposable-stack>` so the five restored schemas are snapshotted in
the database container, the suite is forced to loopback/mock-only services,
and the full payload is restored and fingerprinted in `finally` while only the
disposable writers are stopped. The wrapper also verifies the exact shutdown
flags and Auth/Storage histories and removes its temporary database dump.

Before staging test-data cleanup, verify that archive again and run
`pnpm ops:prelaunch-cleanup -- --backup-archive <absolute .7z path>`. The script
is deliberately restricted to a linked project whose URL and direct database
identity agree, Dodo `test_mode`, `PAYMENTS_ENABLED=false`, and a matching
backup less than 24 hours old. It aborts on live/unknown/non-INR/admin-corrected
financial records, prints counts rather than row content, and requires an exact
project-bound deletion phrase. It removes both Storage buckets, application
test data, and Auth users while preserving the exact six categories and safe
operational configuration. Any partial failure requires payments-off/read-only
incident handling and restoration/reconciliation from the verified backup; do
not rerun blindly.

## Remaining human/hosted gates

No production Sentry, Vercel, Supabase, Resend, Turnstile, Dodo, DNS, backup,
alert destination, penetration test, or security approval is claimed. The owner
confirms Dodo merchant/KYC/business/bank/live capability and brand setup; live
mode still requires current provider status, exact live configuration, owner-
accepted legal/accounting treatment, explicit authorization, and controlled
certification. No credentials, approvals, public activity, delivery results,
security findings, or drill results may be fabricated.
