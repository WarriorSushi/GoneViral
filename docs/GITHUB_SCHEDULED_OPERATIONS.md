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
was added during either implementation step. The owner later configured the
two required GitHub repository secret names and the base-URL repository
variable without disclosing a secret value or recording the configured origin.
On 2026-09-02 the owner authorized activation and Codex created the exact
lowercase enable variable. The guard currently remains enabled for the approved
protected non-production Preview only.

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

## Public-repository hardening

The repository currently enforces these controls:

- secret scanning and push protection are enabled;
- default workflow permission is read-only and workflows cannot approve pull
  requests;
- Actions are restricted to GitHub-owned Actions plus
  `pnpm/action-setup` and `gitleaks/gitleaks-action`, and every Action must use a
  full commit SHA;
- active ruleset `Protect default branch` follows `~DEFAULT_BRANCH`, has no
  bypass actors, and requires a pull request, strict GitHub Actions `quality`
  status, squash-only linear history, and resolved review threads;
- the ruleset blocks default-branch deletion and force pushes while requiring
  zero approving reviews so the solo owner is not permanently locked out.

Repository secret/variable listing verified only the expected names. No secret
value was read. The enable variable was absent and no scheduled workflow was
executed during hardening; its later activation and certification evidence are
recorded below.

## Activation and certification

Before enabling the guard:

1. use the already-authorized stable protected Preview origin recorded in the
   Phase 15 checkpoint; do not reuse production credentials or infer that
   Vercel Hobby is a commercial host;
2. completed: enable GitHub secret scanning/push protection, add default-branch
   reviewed-change protection, retain read-only workflow permissions, restrict
   allowed Actions, and enforce complete Action SHAs;
3. completed by the owner through provider interfaces: add the existing
   matching Preview `CRON_SECRET` as a GitHub Actions repository secret;
4. completed by the owner through provider interfaces: create Vercel's
   Protection Bypass for Automation value, retain it in the approved password
   manager, and add it as GitHub Actions repository secret
   `VERCEL_AUTOMATION_BYPASS_SECRET`;
5. completed by the owner through provider interfaces: add repository variable
   `GONEVIRAL_SCHEDULED_OPERATIONS_BASE_URL`; only the expected name was
   verified, and its value has deliberately not been read;
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

### 2026-09-02 protected-Preview activation evidence

The owner explicitly authorized activation after configuring the two repository
secrets and base-URL variable. Codex verified only their names and safe
configuration shape, then created
`GONEVIRAL_SCHEDULED_OPERATIONS_ENABLED=true`. No credential was read, printed,
or stored in the repository.

Five independent `workflow_dispatch` runs on the default branch succeeded:

| Operation              | Run ID        | Sanitized result   |
| ---------------------- | ------------- | ------------------ |
| email outbox drain     | `33651848820` | HTTP 200, 1,796 ms |
| operational health     | `33651935090` | HTTP 200, 2,037 ms |
| payment reconciliation | `33652002634` | HTTP 200, 2,144 ms |
| logo-asset cleanup     | `33652063724` | HTTP 200, 548 ms   |
| retention cleanup      | `33652118316` | HTTP 200, 825 ms   |

The inspected workflow output contained only the fixed route, HTTP status, and
duration. It contained no response body or credential. A separate bounded
credential-free request to the protected Preview returned HTTP 302 without
following the redirect or printing a body, which confirms that Vercel
Deployment Protection denied the un-bypassed request.

The operational-health HTTP 200 proves that the authenticated check completed;
it does not mean every metric was clear. Sentry emitted the expected Preview
warning `operational_alert:payment_attempt_stale` at 15:58:13 UTC from release
`682969e41cbfba73bb4b2d81681eb2abd2dbe509`, immediately after manual health
run `33651935090`. The code emits this warning when at least one nonterminal
payment attempt is more than 30 minutes old. The notification did not identify
the record or count, so an abandoned staging checkout is plausible but not yet
proved. This is not evidence of a live payment, charge, or route failure.

Automatic cadence is not yet certified. GitHub created no `schedule` event from
16:00 through 16:23:43 UTC, including the 16:05, 16:10, 16:15, and 16:20
five-minute boundaries and the 16:17 hourly boundary. The workflow file was
present on the repository default branch and its API state was `active`. Codex
refreshed that state through GitHub's supported disable/enable API at 16:11 UTC,
but no scheduled run appeared during the remaining observation window. GitHub
documents that scheduled events can be delayed or dropped under load, so this
is recorded as unresolved cadence evidence rather than a route failure.

A narrow follow-up diagnostic confirmed workflow ID `348420162` was `active`,
the repository was a non-fork public repository, and default-branch SHA
`e24c6040443010af72501e30e86e0dab1fdfa6f7` contained the exact expected
workflow. Its remote and local SHA-256 hashes matched, its workflow blob was
`31d223af50e94f31221a45b178975b79039520d7`, and the Actions API reported five
successful manual runs but zero `schedule` runs. The earlier disable/enable
cycle changed the API state timestamp but did not produce a scheduled event.

To force GitHub to process changed schedule metadata without altering any cron
string or cadence, pull request `#4` added the supported explicit IANA timezone
`Etc/UTC` to all three schedules. The default behavior was already UTC, so this
does not change timing, event-to-route mapping, permissions, job logic, secrets,
variables, or hosted configuration. Focused tests passed 9/9, required CI run
`33655967625` passed, and the PR squash-merged as
`fcaf1a206c9f046f900eefd04e1988ba7c93ca3d`. A single bounded check at 16:41:45
UTC still showed state `active`, the updated workflow blob
`a054029b825670a3bebd98c00ec31c72cb2a5858`, and zero scheduled events. GitHub
Status reported Actions operational with no incident on 2026-09-02. GitHub does
not expose its internal schedule registration, so no repository-side root cause
can be proved; the remaining evidence points to GitHub schedule registration or
delivery behavior.

The owner declined a GitHub Support case and authorized a temporary repository-
level canary. Pull request `#6` added `.github/workflows/schedule-canary.yml`
with a five-minute offset schedule, explicit `Etc/UTC`, manual dispatch, empty
permissions, no checkout or Action, no secret/variable reference, and no URL or
external request. It prints only the GitHub event name and UTC timestamp. The
canary safety test and existing scheduler suite passed 10/10, required CI run
`33660917458` passed, and the PR squash-merged as
`cf7e991bcbd0cc97b0069ecfe2124bd07fd365b7`.

The canary registered separately as active workflow ID `348634880`. Manual run
`33661199927` passed in three seconds and printed only the expected manual event
and UTC timestamp, proving the canary job itself is valid. GitHub created no run
for its first fair `17:32 UTC` scheduled slot by the single bounded check at
17:35:41 UTC. At that same check, both active workflows still had zero schedule
events. This removes GoneViral routes, secrets, variables, Vercel, and the
production scheduler job logic from the failing path. It remains possible that
GitHub will deliver a delayed event, so keep the harmless canary temporarily and
inspect both histories once after a longer passive observation window.

Still required: observe successful automatic five-minute, hourly, and daily
runs; verify duplicate/catch-up behavior from hosted evidence; enable or verify
the owner's GitHub Actions failure notifications; add an owner-visible
stale/missing-run check; and perform the documented 60-day activity check. The
manual recovery path is certified, but it does not substitute for those gates.

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
