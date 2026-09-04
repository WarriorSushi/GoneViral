# Cloudflare scheduled operations

Last updated: 2026-09-05 (Asia/Kolkata)

## Boundary and status

This is the owner-selected replacement for GitHub scheduled events during
private staging. The Worker, Wrangler configuration, and focused tests are
implemented. On 2026-09-03 the owner reported that the inert deployment
succeeded, exactly three Cron Triggers exist, the enable binding remains exact
lowercase `false`, and both required Worker secret names are present. No secret
value was disclosed or read. This proves the inert Cloudflare setup only; it is
not automatic cadence or hosted-route execution evidence.

On 2026-09-03 the owner explicitly authorized activation. Protected pull
request `#14` changed only the checked-in enable binding from `false` to `true`
and its focused static assertion, then squash-merged as
`e813fb6de43ea9b4979bc8f7abefa9d485dab787`. The owner subsequently reported
that deployment succeeded and the Cloudflare dashboard shows the guard as
exact `true`. No secret value or raw deployment output was provided. Automatic
cadence and failure/staleness evidence remain pending.

On 2026-09-04 the owner reported partial automatic cadence evidence: the
five-minute trigger fired repeatedly and both `drain-email-outbox` and
`check-operational-health` returned `200 / ok`; the hourly trigger fired and
`reconcile-payments` returned `200 / ok`; no error was visible in the observed
log window. The daily `43 2 * * *` trigger had not yet reached its next
scheduled time, so daily evidence remains pending rather than failed. No raw
log output or secret value was provided.

On 2026-09-05 a bounded, read-only Cloudflare GraphQL Analytics query closed
the daily cadence gate without invoking a route or changing the Worker. It
found successful scheduled invocations at `02:40:15Z`, `02:43:08Z`, and
`02:45:15Z` on 2026-09-04. The middle invocation is uniquely the daily
`43 2 * * *` slot and recorded exactly one request, zero Worker errors, and two
subrequests, matching the two fixed daily routes. Because the Worker throws if
either route is non-2xx, redirected, timed out, or failed at the network layer,
the successful outcome certifies both daily operations. Across the bounded
Production analytics window beginning 2026-09-03 19:30 UTC, all 331 Worker
invocations were `success` with zero runtime errors and 638 subrequests.

No naturally occurring failure was present, so actual failure-notification
delivery is not inferred from the tested fail-closed implementation. The
documented topology also still has no separate owner-visible missing-run alert;
a Worker cannot report an invocation that never occurred. Failure-notification
delivery and stale/missing-run detection therefore remain pending rather than
failed. No trigger, binding, secret, Worker version, route, or hosted business
state changed during this evidence query.

After the stable protected Preview alias was updated to application commit
`b8298a798efce1195b7c5ad38add60d8a54b2fd1`, the next ordinary five-minute
event provided targeted lifecycle evidence without a scheduler change or
manual route invocation. Vercel logged `operational_health_checked` with one
expired abandoned attempt and zero alerts, and an independent aggregate
database query confirmed the transition with no payment, fulfilment, ledger,
success, or open reconciliation side effect. This is additional five-minute
route evidence only; it does not certify the still-pending daily or
failure/staleness gates.

The Worker will only invoke GoneViral's existing authenticated cron routes. It
must not contain payment, email, health, reconciliation, logo, retention, or
other application business logic. The existing route authentication and
database/advisory-lock idempotency remain authoritative.

GitHub Actions is retired as an automatic scheduler. Its workflow is manually
disabled, its enable variable is absent, and its checked-in workflow has no
`schedule` trigger. The historical manual protected-Preview route
certifications remain valid.

## Architecture

Use one ES-module Cloudflare Worker with only a `scheduled()` handler and no
public `fetch()` handler, route, custom domain, storage, queue, Durable Object,
KV namespace, D1 database, or third-party dependency.

The handler will:

1. match `controller.cron` against a checked-in exact allowlist;
2. stop before reading credentials unless a separate enable binding equals the
   exact lowercase value `true`;
3. validate one configured base URL as an origin-only HTTPS URL with no
   username, password, path, query, or fragment;
4. construct only the fixed allowlisted route URLs;
5. send `Authorization: Bearer <CRON_SECRET>` and
   `x-vercel-protection-bypass: <VERCEL_AUTOMATION_BYPASS_SECRET>` in memory;
6. use `GET`, `redirect: "manual"`, and a 45-second total abort timeout for
   each request;
7. attempt every route assigned to the trigger and fail the scheduled event if
   any request times out, redirects, fails at the network layer, or returns a
   non-2xx status;
8. discard response bodies and log only the fixed operation name, numeric HTTP
   status, duration, and a fixed error code. It will never log a URL, header,
   credential, response body, or exception message.

There will be no Worker-level retry loop. The existing durable/idempotent
application workers catch up on the next scheduled run. Provider retries or
duplicate Cron deliveries remain safe because the application routes retain
their existing locking and idempotency controls.

## UTC trigger and route map

Cloudflare Cron Triggers execute in UTC. Three account-level Cron Trigger slots
cover all five routes:

| Cron expression | Fixed routes                                                         |
| --------------- | -------------------------------------------------------------------- |
| `*/5 * * * *`   | `/api/cron/drain-email-outbox`, `/api/cron/check-operational-health` |
| `17 * * * *`    | `/api/cron/reconcile-payments`                                       |
| `43 2 * * *`    | `/api/cron/cleanup-logo-assets`, `/api/cron/cleanup-retention`       |

The two-route groups may execute concurrently so one route failure does not
prevent the other attempt. The handler waits for both and reports the Cron
event as failed if either failed. At most two outgoing connections and two
subrequests are used by one invocation.

## Required Cloudflare configuration

Worker name: `goneviral-scheduled-operations-staging` (retained to update the
single existing Worker in place and avoid duplicate scheduling).

| Binding                                   | Kind                       | Treatment                                                                                |
| ----------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------- |
| `CRON_SECRET`                             | Cloudflare Worker secret   | Exact server-side secret already used by the protected Preview routes                    |
| `VERCEL_AUTOMATION_BYPASS_SECRET`         | Cloudflare Worker secret   | Exact Vercel Protection Bypass for Automation value                                      |
| `GONEVIRAL_SCHEDULED_OPERATIONS_BASE_URL` | non-secret Worker variable | Exact active HTTPS origin, currently `https://goneviral.in`, with no path/query/fragment |
| `GONEVIRAL_SCHEDULED_OPERATIONS_ENABLED`  | non-secret Worker variable | Checked in as `false`; change to exact `true` only in a reviewed activation change       |

The Worker configuration will initially contain the three triggers but keep the
enable binding `false`. Therefore even an inert first deployment can register
the schedules without invoking a GoneViral route. After the two secrets and
base URL are configured and their names/shape are verified without reading
secret values, a separate reviewed activation change may set the binding to
`true` and deploy that exact version.

Workers Logs should be enabled at full sampling during staging. Certification
must inspect Cloudflare Cron Trigger Past Events and safe Worker logs for at
least one five-minute, one hourly, and one daily trigger. Do not repeatedly poll
between expected slots.

## Workers Free plan fit and limitations

At the proposed cadence, the Worker receives approximately 313 scheduled
invocations per UTC day and makes approximately 602 outbound route calls. This
is comfortably below the current Workers Free request limit of 100,000 per day.
Each invocation uses at most two of the 50 permitted subrequests and two of the
six permitted simultaneous outgoing connections.

Important Free-plan limits and operational constraints:

- only five Cron Triggers are available per Cloudflare account; GoneViral uses
  three, so the owner must first confirm at least three slots are free;
- Free Workers receive 10 milliseconds of CPU time per invocation. Network wait
  time does not count as CPU time, so the tiny validation-and-fetch handler is
  suitable, but it must avoid dependencies, response parsing, and heavy setup;
- memory is 128 MB and the Cron Trigger wall-time limit is 15 minutes;
- trigger additions, changes, and removals can take up to 15 minutes to
  propagate;
- Cloudflare runs Cron Triggers on UTC and on underutilized machines. The design
  must not assume exact-once or perfectly punctual delivery;
- Workers Logs provide invocation and custom-log evidence, but a separate
  owner-visible missing-run alert is still required before commercial launch;
- the Worker cannot enforce a global concurrency group without adding state.
  GoneViral's existing route locks and idempotency therefore remain the overlap
  authority;
- Cloudflare `fetch()` supports one bounded total abort timeout but does not
  expose the separate connect-timeout control used by the retired Node runner;
- exceeding the Free daily request or CPU limit causes failed invocations rather
  than paid overage. Account-wide usage by unrelated Workers must therefore be
  included when checking headroom.

Current official references:

- <https://developers.cloudflare.com/workers/configuration/cron-triggers/>
- <https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/>
- <https://developers.cloudflare.com/workers/configuration/secrets/>
- <https://developers.cloudflare.com/workers/platform/limits/>
- <https://developers.cloudflare.com/workers/platform/pricing/>
- <https://developers.cloudflare.com/workers/observability/logs/workers-logs/>

## Implementation and activation sequence

1. **Complete:** the owner confirmed a Cloudflare account on Workers Free with
   at least three unused Cron Trigger slots.
2. **Complete locally:** the dependency-free Worker, Wrangler `4.128.0`,
   Wrangler configuration, and focused unit/static tests are checked in with
   the enable binding `false`. `wrangler deploy --dry-run` validates the bundle
   and exposes only the two non-secret bindings.
   The compatibility date is pinned to `2026-09-02`, which is non-future in
   Cloudflare UTC. An earlier inert deployment attempt was rejected before
   creation because the original `2026-09-03` pin was still a future UTC date.
3. **Complete:** the owner completed the interactive boundary and successfully
   ran the deployment from the owner's terminal; no credential or browser
   authorization result was provided to Codex.
4. **Complete:** the owner reported that the reviewed inert Worker deployed
   successfully with the enable binding still `false`.
5. **Complete:** the owner reported that both required Worker secret names are
   present. No secret value was disclosed or read.
6. **Complete for the inert gate:** the owner reported exactly three Cron
   Triggers and the disabled guard. No automatic route execution or cadence is
   claimed while the guard is `false`.
7. **Activation authorized and reviewed:** protected pull request `#14` changed
   the checked-in enable binding to exact `true` without changing Worker logic,
   routes, schedules, Preview origin, or secret handling. **Deployment
   complete by owner report:** the deployment succeeded and the dashboard guard
   shows exact `true`. Allow up to 15 minutes for trigger propagation.
8. **Complete:** the earlier bounded observed window confirms
   repeated five-minute events and one hourly event, with all three assigned
   operations returning `200 / ok`; the later read-only analytics evidence above
   certifies the natural daily invocation and its two successful subrequests.
9. Failure-notification delivery and owner-visible missing-run detection remain
   pending. Do not force a failure, change triggers, redeploy, or poll merely to
   manufacture that evidence.
10. Before any future scheduler replacement or production scheduler activation,
    disable this Worker or set its enable binding away from `true` first so two
    schedulers can never target the same environment concurrently.

### Current gate and exact next action

The activated deployment is complete by owner report. No secret value,
credential, or raw deployment output needs to be provided to Codex. Do not
redeploy or manually invoke any route for certification.

Five-minute and hourly automatic cadence are confirmed by sanitized owner
report, and the later read-only analytics evidence above certifies daily
cadence. Do not change or redeploy the scheduler or manually invoke routes for
certification. Failure-notification delivery and the independent owner-visible
missing-run monitor remain pending. Production hosting and plan selection
remain a separate owner decision immediately before commercial launch.

On 2026-09-04 the owner authorized the production-shaped pre-launch topology.
The same sole Worker was updated in place to target
`https://goneviral.in`; the enable guard remains `true`, both secret bindings
remain present without disclosure, and all three Cron Triggers are unchanged.
Deployed version `cbeab8d8-234a-47f1-ada4-a8266125d5f0` contains this target
transition. The focused Worker suite passed 9/9 and `wrangler deploy --dry-run`
succeeded before deployment.

A later bounded, read-only Vercel log query verified the transition without
manual invocation: repeated natural five-minute events reached both Production
routes with `200`, beginning at `2026-09-03T23:55:14.414Z`, and the natural
hourly reconciliation event returned `200` at
`2026-09-04T00:17:08.822Z`. Five-minute events continued successfully after
the application was redeployed to load the rotated Resend webhook secret. The
later read-only Cloudflare analytics certified daily cadence. Failure-
notification delivery and missing-run detection remain separate and must not be
manufactured by polling or redeployment.
