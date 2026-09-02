# Cloudflare scheduled operations proposal

Last updated: 2026-09-02 (Asia/Kolkata)

## Boundary and status

This is the owner-selected replacement design for GitHub scheduled events during
private staging. It is a proposal only. No Cloudflare Worker, account binding,
secret, variable, Cron Trigger, deployment, or hosted request has been created
or executed.

The Worker will only invoke GoneViral's existing authenticated cron routes. It
must not contain payment, email, health, reconciliation, logo, retention, or
other application business logic. The existing route authentication and
database/advisory-lock idempotency remain authoritative.

GitHub Actions is retired as an automatic scheduler. Its workflow is manually
disabled, its enable variable is absent, and its checked-in workflow has no
`schedule` trigger. The historical manual protected-Preview route
certifications remain valid.

## Proposed architecture

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

Proposed Worker name: `goneviral-scheduled-operations-staging`.

| Binding                                   | Kind                       | Treatment                                                                          |
| ----------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------- |
| `CRON_SECRET`                             | Cloudflare Worker secret   | Exact server-side secret already used by the protected Preview routes              |
| `VERCEL_AUTOMATION_BYPASS_SECRET`         | Cloudflare Worker secret   | Exact Vercel Protection Bypass for Automation value                                |
| `GONEVIRAL_SCHEDULED_OPERATIONS_BASE_URL` | non-secret Worker variable | Exact protected Preview HTTPS origin, with no path/query/fragment                  |
| `GONEVIRAL_SCHEDULED_OPERATIONS_ENABLED`  | non-secret Worker variable | Checked in as `false`; change to exact `true` only in a reviewed activation change |

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

## Proposed implementation and activation sequence

1. Owner reviews this design and confirms a Cloudflare account on Workers Free
   with at least three unused Cron Trigger slots.
2. Implement the dependency-free Worker, Wrangler configuration, and focused
   unit/static tests locally. Keep the enable binding `false`; do not deploy.
3. Owner authenticates Wrangler interactively in the owner's terminal. Codex
   must not launch or receive the interactive credential flow.
4. Deploy the inert reviewed Worker with the enable binding still `false`.
5. Owner adds the two secret values through the Cloudflare dashboard. Never put
   either value in chat, command arguments, repository files, `.env` files, or
   logs.
6. Configure the exact non-secret Preview origin and verify only binding names,
   Worker identity, trigger strings, observability, and disabled guard.
7. Make a separate reviewed activation change setting the enable binding to
   exact `true`, deploy it, and allow up to 15 minutes for trigger propagation.
8. Inspect one bounded set of Past Events/logs after the relevant slots. Verify
   fixed route/status/timing-only logs and confirm no credential or body appears.
9. Observe five-minute, hourly, and daily cadence plus failure/duplicate/catch-up
   behavior before marking the scheduler certified.
10. Before any future scheduler replacement or production scheduler activation,
    disable this Worker or set its enable binding away from `true` first so two
    schedulers can never target the same environment concurrently.

No Cloudflare configuration or deployment is authorized by this proposal
alone. Production hosting and plan selection remain a separate owner decision
immediately before commercial launch.
