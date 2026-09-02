# GitHub scheduled operations

## Boundary and current state

`.github/workflows/scheduled-operations.yml` is the initial owner-selected
GitHub Actions scheduler. It calls existing authenticated route handlers; it
does not contain payment, email, health, asset, or retention business logic.
The implementation is committed as
`3b6e8a8327ecadbf1242b2ba8114d7a228e1c9d1`. Protected Vercel Preview support
is committed as `a6bc5289a7a0b9dd9222ae6ba9bc332d81b30109`.

The workflow is disabled by default. A push, visibility change, fork, or manual
dispatch cannot invoke a hosted route unless the repository variable
`GONEVIRAL_SCHEDULED_OPERATIONS_ENABLED` exists with the exact lowercase value
`true`. The checked-in runner repeats this check before it reads configuration.
No hosted secret, repository variable, deployment, domain, or route invocation
was added during either implementation step.

## Fixed schedule and route map

GitHub evaluates schedules in UTC and only from the default branch.

| Schedule (UTC)   | Fixed authenticated routes                                        |
| ---------------- | ----------------------------------------------------------------- |
| `*/5 * * * *`    | email outbox drain, then operational health                       |
| `17 * * * *`     | payment reconciliation                                            |
| `43 2 * * *`     | logo-asset cleanup, then retention cleanup                        |
| manual selection | exactly one of the five allowlisted operations chosen from the UI |

The runner accepts no caller-provided URL or route. It derives routes from the
GitHub event and a checked-in allowlist, requires the configured base URL to be
an origin-only `https://` URL without credentials, path, query, or fragment,
uses a 10-second connection timeout and 45-second total timeout, rejects every
non-2xx response and redirect, and never prints a response body. Logs contain
only the fixed route, status class/code, and elapsed milliseconds. One workflow
concurrency group prevents overlap; database/advisory locks and worker
idempotency remain the duplicate-run authority.

For the protected Vercel Preview, the runner constructs both authorization
headers in memory: `Authorization: Bearer ...` authenticates the application
cron route and `x-vercel-protection-bypass: ...` passes Vercel Deployment
Protection. It fails closed before any request if either secret is absent and
does not place either value in the command, URL, response handling, or logs.

Workflow permissions are `contents: read`. Checkout credentials are not
persisted. Every referenced Action is pinned to a complete commit SHA. The
workflow has only `schedule` and `workflow_dispatch` triggers and never uses
`pull_request_target`.

## Hosted configuration

Configure values only through the GitHub and hosting-provider interfaces. Never
place values in chat, a shell argument, a repository file, an issue, a log, or
an evidence document.

| Location                     | Name                                      | Treatment                                                         |
| ---------------------------- | ----------------------------------------- | ----------------------------------------------------------------- |
| GitHub Actions secret        | `CRON_SECRET`                             | same generated value as the approved target's server-only secret  |
| GitHub Actions secret        | `VERCEL_AUTOMATION_BYPASS_SECRET`         | exact Vercel automation-bypass value; never an application secret |
| Hosting encrypted secret     | `CRON_SECRET`                             | server-only; never a public/client variable                       |
| Vercel Deployment Protection | automation bypass secret                  | generate in project settings and copy only to GitHub Actions      |
| GitHub repository variable   | `GONEVIRAL_SCHEDULED_OPERATIONS_BASE_URL` | exact approved HTTPS origin only                                  |
| GitHub repository variable   | `GONEVIRAL_SCHEDULED_OPERATIONS_ENABLED`  | omit or keep non-`true` until activation is explicitly authorized |

The base URL is configuration, not an authorization boundary. `CRON_SECRET`
authenticates the application route. `VERCEL_AUTOMATION_BYPASS_SECRET` crosses
only the Vercel protection layer. GitHub repository permissions and workflow
triggers keep both unavailable to untrusted pull-request runs.

## Activation and certification

Before adding the secret or enabling the guard:

1. use the already-authorized stable protected Preview origin recorded in the
   Phase 15 checkpoint; do not reuse production credentials or infer that
   Vercel Hobby is a commercial host;
2. enable GitHub secret scanning/push protection where available, add a
   default-branch ruleset or equivalent reviewed-change protection, retain
   read-only default workflow permissions, and keep workflows SHA-pinned;
3. retrieve the existing matching Preview `CRON_SECRET` from the owner's
   password manager and add it as a GitHub Actions repository secret; do not
   rotate it unless the stored value is unavailable;
4. in Vercel project Settings -> Deployment Protection -> Protection Bypass for
   Automation, generate a value, save it directly to the owner's password
   manager, and add the same value as GitHub Actions repository secret
   `VERCEL_AUTOMATION_BYPASS_SECRET`;
5. configure `GONEVIRAL_SCHEDULED_OPERATIONS_BASE_URL` as the stable protected
   Preview HTTPS origin with no path, query, fragment, or credentials;
6. set the enable variable to exact `true` only when hosted invocation is
   authorized, manually dispatch each operation independently, and verify
   authentication denial separately without exposing a credential;
7. verify route/status/timing-only logs, durable/idempotent duplicate behavior,
   missed/delayed catch-up, one concurrency group, and no response body or
   secret disclosure;
8. observe the five-minute, hourly, and daily automatic runs from the default
   branch, enable workflow-failure notifications, and add an owner-visible
   stale/missing-run check;
9. after 60 days without public-repository activity, verify that GitHub has not
   automatically disabled the schedules.

To stop calls immediately, remove or change the enable variable away from exact
`true`. During a suspected scheduler-secret compromise, disable the guard,
rotate the hosting and GitHub values atomically through their interfaces, and
certify each route again before re-enabling.

## Local verification

Run:

```powershell
pnpm test:scheduled-operations
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
```

The focused suite statically verifies schedules, routes, permissions, triggers,
the disabled guard, immutable Action pins, concurrency, and the secret-free
command. It also exercises fixed event mapping, strict HTTPS parsing, both
in-memory authentication headers, missing-bypass fail-closed behavior, bounded
timeouts, safe log construction for both credentials, and non-2xx failure
without making a network request. On the protected-Preview patch,
`pnpm test:scheduled-operations` passed 9/9 and `pnpm test` passed 212/212.
