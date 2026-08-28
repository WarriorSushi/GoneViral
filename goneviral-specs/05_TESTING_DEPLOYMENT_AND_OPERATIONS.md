# 05 — Testing, Deployment and Operations

**Depends on:** all previous documents  
**Operational principle:** financial correctness and recoverability outrank cosmetic uptime

---

## 1. Quality strategy

GoneViral handles public reputation, money and moderation. Testing must prove behaviour at multiple layers:

```text
pure domain tests
-> database constraint/query tests
-> transactional integration/concurrency tests
-> provider contract tests
-> API/component tests
-> browser end-to-end tests
-> staging/sandbox/live certification
-> continuous reconciliation and operational drills
```

Mock-only payment tests are insufficient. Browser-only “success” tests are actively dangerous. Critical tests must run against real PostgreSQL transactions and raw webhook fixtures.

---

## 2. Test environments

### Local

- local PostgreSQL/Supabase or isolated development project;
- mock payment provider for deterministic tests;
- Cashfree sandbox for integration testing;
- Resend safe/test recipient mode;
- Turnstile test keys/current documented test mode;
- no production credentials/data.

### CI

- ephemeral PostgreSQL service/database;
- deterministic migrations/seeds;
- mock provider plus committed redacted webhook fixtures;
- browser tests against production build;
- no network dependency for core test suite where avoidable;
- separate optional scheduled provider-sandbox contract suite.

### Staging

- dedicated Vercel project/environment;
- dedicated Supabase project/branch approved for staging;
- Cashfree sandbox;
- authenticated staging email domain or safe recipients;
- protected from indexing/public confusion;
- same architecture/config shape as production.

### Production

- Vercel Pro + Supabase Pro in selected regions;
- live provider only after gates;
- no test fixtures/fake data;
- controlled founder-owned smoke payment only through real accounting policy.

Never use production database/payment secrets in previews or local CI.

---

## 3. Test data and fixtures

### Domain fixtures

Create builders with explicit amounts/timestamps/IDs:

```text
listingBuilder
attemptBuilder
providerEventBuilder
providerPaymentBuilder
adjustmentBuilder
ledgerEntryBuilder
owner/admin/session fixtures
```

Defaults should be valid and clearly synthetic (`example.test`, `test.invalid`). Tests override only relevant fields.

### Provider fixtures

Keep redacted raw webhook bodies and headers for:

- success;
- pending/failed/dropped/expired;
- duplicate delivery;
- multiple payment attempts under order;
- refund/chargeback/restoration;
- unknown future event;
- invalid/mutated signature/amount/currency/order/environment.

Fixtures must preserve exact byte/string encoding required for signature tests while containing no live secrets/customer data.

### Production data policy

No synthetic seed records in production. Local/staging fixtures are unmistakably test content and excluded from search indexing/analytics where appropriate.

---

## 4. Unit test plan

### Money

- strict parsing and conversion;
- whole-rupee enforcement;
- bigint values beyond `Number.MAX_SAFE_INTEGER`;
- addition/subtraction/comparison;
- Indian formatting;
- JSON string serialization;
- rejection of decimals, signs, exponent, whitespace tricks, Unicode digits where unsupported and overflow.

### Minimum raise

Table-driven cases from `00` and boundary/property tests:

```text
O >= 49_900
minimum >= 100_000
minimum % 100 == 0
minimum == max(ceil(O/1000)*100, 100000)
monotonic non-decreasing in O
```

### Takeover quote

```text
required >= listing minimum
current + required >= target + 100
required is minimal whole-rupee amount satisfying both
```

### Ranking comparator

- total descending;
- reached time ascending;
- ID ascending;
- deterministic/transitive ordering;
- reversal/application time semantics.

### IST Today

Test dates around UTC/IST midnight, month/year/leap boundaries. India has no daylight-saving adjustment, but use IANA zone rather than fixed-offset string in business logic.

### State machines

- allowed listing lifecycle/moderation transitions;
- payment success monotonicity;
- adjustment desired/applied delta;
- public eligibility matrix;
- owner/admin permission rules.

### Security utilities

- URL parsing/canonicalisation;
- relative redirect allowlist;
- HMAC visitor/email/rate identifiers;
- log redaction;
- public DTO allowlist;
- upload type/dimension policies.

---

## 5. Database migration and constraint tests

For every migration:

1. create empty database;
2. apply all migrations;
3. verify schema/constraints/indexes/grants/seeds;
4. insert representative valid rows;
5. prove invalid rows reject;
6. migrate from previous tagged schema when applicable;
7. run application tests;
8. run Supabase advisors where available.

Critical constraint tests:

- negative/non-whole listing totals fail;
- invalid original/total lifecycle combinations fail;
- duplicate destination canonical key fails;
- duplicate provider event/payment/adjustment identity fails;
- second positive ledger fulfilment for one attempt fails;
- invalid entry type/sign fails;
- invalid category/state fails;
- application role cannot update/delete ledger/audit;
- public/anon/authenticated cannot directly read private/application tables.

Generated migration SQL must be reviewed, not blindly applied.

---

## 6. Query tests

### Main/category

Seed mixed totals/ties/statuses/categories and assert exact ordered IDs/ranks. Include removed/suspended/unreviewed/inactive-zero records to prove exclusion.

### Today

Seed ledger/daily rows on IST boundaries and positive/negative nets. Assert:

- current business date only;
- net >0 only;
- public eligibility;
- daily amount DESC, reached time ASC, ID ASC;
- lifetime total displayed separately;
- category filtering is not accidentally applied unless route says so.

### Pagination

- no duplicates/skips under static snapshot;
- deterministic keyset cursor;
- rank numbering remains correct;
- invalid cursor fails safely.

### Public projection

Snapshot/shape test proves no owner email/user ID/provider IDs/payment method/report/admin/raw destination review data. Also inspect rendered RSC/HTML/JSON responses in integration tests.

### Quote/estimated rank

Compare query result with pure domain calculation across seeded boards, ties and hidden listings.

---

## 7. Transaction and concurrency tests

Run against real PostgreSQL with separate connections and synchronisation barriers.

### Duplicate success

Send same success event concurrently/repeatedly. Assert:

```text
1 provider event logical result
1 provider payment
1 positive ledger entry
attempt succeeded
listing total incremented once
daily incremented once
1 logical email outbox event
```

### Same payment, different event IDs

Provider may resend semantic status via new event ID. Assert one fulfilment due payment/attempt constraints.

### Two legitimate raises

Create two distinct attempts and settle concurrently. Assert final total = start + A + B, two ledger entries and distinct application times/valid deterministic tie state.

### Two payments for one provider order

First settled fulfils. Second genuine settled becomes duplicate-paid/quarantined, no second sponsorship. Reconciliation/admin queue sees it. A later refund of that unfulfilled duplicate is recorded for settlement/customer operations and applies zero rank delta.

### First success race

Two success paths for initial attempt/listing cannot set original twice or create two initial ledger entries.

### Payment vs refund

Run success and related effective adjustment in both arrival orders and concurrent schedules. Final state converges once relationship becomes resolvable; orphan adjustment remains durable/quarantined until reconciliation, never drives negative total.

### Adjustment transitions

Repeated effective -> no-op; reversed -> restoration; repeated reversal -> no-op; effective again -> negative delta again only if provider semantics permit and unique transition is represented.

### Deadlocks/timeouts

Stress standard lock order. Assert no unbounded retries; transient deadlock is retried boundedly, permanent lock timeout creates safe retryable failure/5xx.

### Destination collision

Two initial submissions for same canonical destination create one listing and safe duplicate/recovery result.

---

## 8. Provider contract tests

### Webhook signature

Test exact raw body and headers against current official Cashfree algorithm. Include:

- correct signature;
- one-byte body change;
- wrong secret;
- stale/missing timestamp according to docs;
- duplicate/replay;
- JSON reserialization difference;
- wrong environment.

Do not parse/restringify before verification.

### Semantic mapping

For every known provider status/event:

- normalized internal type;
- final vs pending;
- monotonic transition;
- identifiers and amount/currency;
- unknown authentic event quarantined.

### Order creation

- deterministic order/idempotency key;
- exact amount/currency;
- safe return URL/provider metadata;
- timeout followed by retrieval, not duplicate creation;
- sandbox/live endpoints and credentials cannot mix.

### Periodic live-doc verification

Before each provider SDK/API upgrade, re-read official API version, signature, idempotency, order/payment/refund and webhook retry docs; update contract fixtures/tests first.

---

## 9. API and mutation tests

For every Route Handler/Server Action:

- method/content type/body size;
- Zod validation;
- authentication/authorisation;
- CSRF/origin where relevant;
- rate limits/Turnstile;
- idempotency/retry;
- safe error code/status/body;
- no PII/secret in response/log;
- no-store/cache rules;
- failure between external/internal steps.

High-priority endpoints:

```text
create initial payment attempt
create raise attempt
payment status
provider webhook
magic-link request/auth callback/claim
owner edits/change requests
logo upload intent/finalise
report
safe redirect
admin moderation/refund/flags
cron/outbox/reconciliation
```

Fuzz/path tests for public IDs/slugs/UUIDs, oversized JSON, duplicate fields, malformed Unicode and unexpected enum values.

---

## 10. Browser end-to-end tests

Use Playwright against a production build and deterministic provider mock. Use real Cashfree sandbox for a smaller manual/contract suite where automation is supported.

### Public

- empty homepage truthfully invites first sponsor;
- populated Main order/ties/amounts;
- Today definition/reset date;
- categories/shareable URLs;
- listing detail/outbound safe redirect;
- suspended/removed not publicly reachable;
- responsive navigation/board.

### Initial sponsor

- new listing form validation;
- duplicate destination recovery;
- deterministic low-risk auto-clear, ambiguous pending-review and prohibited submission handling;
- target quote and current-estimate warning;
- custom amount/preset;
- review disclosure;
- duplicate submit/network retry;
- hosted/mocked checkout return;
- pending page has no false confirmation;
- webhook then confirmed actual rank;
- board moved during payment copy.

### Auth/owner

- generic magic-link request;
- claim correct email;
- wrong account denial;
- owner dashboard/history;
- raise minimum/checkout/confirmation;
- immediate safe edit vs review request;
- sign-out/session expiry.

### Adjustments

- partial/full reversal/restoration reflected in owner/public UI and Today/Main.

### Reports/admin

- report submission/rate/Turnstile;
- admin role gates;
- suspend/unsuspend/remove/change approval;
- cache/public redirect changes;
- audited reason visible only admin;
- payment quarantine/reconciliation queue.

### Sharing/clicks

- share copy/image uses actual rank/disclosure;
- redirect counts one privacy-safe click and does not affect rank.

---

## 11. Accessibility test plan

### Automated

- axe on all major public, sponsor, pending/confirmed, manage and admin screens;
- HTML semantics/labelling tests;
- colour contrast validation;
- linting for accessibility rules where useful.

### Manual

- keyboard-only full sponsor and owner flows;
- focus order/visibility/return in menus, sheets, dialogs;
- screen reader smoke (NVDA/Windows and/or VoiceOver);
- 200% browser zoom and text scaling;
- 320px width with no horizontal page scroll;
- reduced motion;
- error/status announcements and no repeated live-region spam;
- touch targets;
- board table/card semantics;
- high contrast/colour-independent information.

Target WCAG 2.2 AA. Record accepted exceptions with rationale/remediation date; no critical blocker may launch.

---

## 12. Performance and load testing

### User-facing targets

At production launch, target mobile p75 field performance:

```text
LCP <= 2.5 s
INP <= 200 ms
CLS <= 0.1
```

Lab/CI budgets are supporting indicators, not substitutes for field data. Keep initial JS/hydration modest, logos optimised and board server-rendered.

### Server targets

Initial goals under expected launch load:

- cached public board responses predominantly served from cache/CDN;
- uncached indexed board query p95 comfortably below 200ms on realistic dataset;
- payment fulfilment DB transaction p95 comfortably below 500ms excluding network/signature parse;
- lock waits normally low tens of milliseconds; alert on sustained/high waits;
- webhook endpoint completes well inside provider timeout;
- no connection-pool exhaustion;
- outbox/reconciliation backlog bounded.

These are engineering targets, not contractual promises; tune after measurement.

### Dataset scenarios

Benchmark at least:

- 1k listings / 10k ledger rows;
- 10k listings / 100k ledger rows;
- 100k listings / 1m ledger rows using generated local/staging data;
- skewed top listings and burst payments;
- Today-heavy day and click volume.

Use `EXPLAIN (ANALYZE, BUFFERS)` and record plans for ranking/daily/owner/admin/reconciliation queries. Do not add indexes without measuring write/read trade-off.

### Load scenarios

- public read burst with cache cold/warm;
- checkout-intent rate with provider mocked;
- duplicate webhook storm;
- concurrent distinct raises across same/different listings;
- status polling bounded clients;
- click redirect burst/bots;
- outbox/reconciliation workers.

Never load-test live provider/payment endpoints without explicit provider approval.

---

## 13. Security testing

### Automated

- dependency audit/lockfile review;
- secret scan;
- static analysis/lint;
- SAST/code scanning where available;
- headers/CSP checks;
- database advisors;
- container/SBOM only if artifacts introduced;
- dynamic route abuse tests.

### Manual threat cases

- forged/mutated/replayed webhook;
- payment amount/order/currency/environment substitution;
- IDOR for owner/admin/payment status/upload/change request;
- auth open redirect/magic-link enumeration/rate bypass;
- CSRF on cookie-auth mutations;
- stored/reflected XSS strings in every user field/email/share image;
- SQL injection/sort/filter manipulation;
- private/IP/encoded URL/open redirect;
- malicious/oversize/polyglot/decompression-bomb logo;
- public cache/RSC/Sentry/log PII leakage;
- admin role tampering/client route bypass;
- click/report/status polling DoS;
- provider/email/storage/database/cache failure.

Conduct an external security review/penetration test when budget/traction permits, especially before higher payment limits/admin refund tooling.

---

## 14. CI pipeline

Recommended pull-request jobs:

1. install with frozen lockfile;
2. format/lint;
3. typecheck;
4. unit/property tests;
5. start ephemeral PostgreSQL and apply migrations;
6. DB/query/transaction/integration tests;
7. provider fixture contract tests;
8. production build;
9. Playwright smoke/e2e;
10. accessibility scans;
11. secret/dependency/security scans;
12. migration/schema diff checks.

Main/release adds:

- full e2e/concurrency suite;
- optional Cashfree sandbox contract suite;
- realistic query performance regression checks;
- deploy preview/staging and browser smoke;
- release artifact/version metadata.

Do not let flaky tests become ignored. Quarantine only with owner, issue and deadline; financial tests must be deterministic.

---

## 15. Branching, migrations and releases

A simple trunk-based process is sufficient:

- short feature/phase branch;
- reviewed PR/checks;
- merge to protected main;
- automatic preview/staging;
- tagged/manual production promotion.

### Migration discipline

- application code must be backward compatible with currently deployed schema during rollout where needed;
- use expand -> backfill -> switch -> contract for risky changes;
- never combine irreversible financial-history rewrite with code deploy;
- record migration version in release;
- take/verify backup before high-risk production migrations;
- run migration against staging copy/realistic dataset;
- no ad-hoc dashboard SQL that is not captured in migration/incident record.

### Release checklist

- exact commit/tag;
- migration list and plan;
- configuration/flag changes;
- provider webhook/API version;
- test/security/accessibility/performance results;
- backup status;
- rollback/forward-fix plan;
- launch operator/sign-off.

---

## 16. Vercel deployment configuration

### Projects/environments

Prefer separate staging and production projects or rigorously isolated environments with distinct credentials. Production domain is `goneviral.in` with canonical redirect (`www` policy chosen once).

### Region

Set database-connected functions to Mumbai (`bom1`) while Supabase is Mumbai/South Asia. Verify current Vercel syntax/support during Phase 0. Do not assume Edge runtime improves latency for DB work.

### Function behaviour

- Node runtime;
- bounded duration/memory appropriate to webhook/image/reconciliation routes;
- no unbounded in-process background work after response;
- cron endpoints authenticated with secret/platform verification;
- no provider secret in preview unless staging sandbox;
- logs/analytics/Sentry configured with PII controls.

### Domains

- HTTPS/canonical redirect;
- provider return/webhook allowlists updated;
- Supabase Auth site/redirect URLs exact;
- Resend SPF/DKIM/DMARC configured;
- security headers/CSP tested on production domain.

### Plan

Vercel Hobby may be used for development/prototyping only if terms fit. Activate Pro before commercial live payments. Verify current plan terms/pricing at launch.

---

## 17. Supabase deployment configuration

### Project/region

Production Supabase Pro in closest available Mumbai/South Asia region (`ap-south-1` at specification time). Staging is separate.

### Database

- direct migration URL and Supavisor transaction pooler runtime URL;
- connection/pool settings sized conservatively;
- PITR/backups/retention according to current Pro capabilities and risk;
- SSL required;
- least-privilege server/migration roles;
- network restrictions where supported/operationally feasible;
- database/security advisors clean;
- extensions minimal and documented.

### Auth

- email magic link/PKCE only in V1;
- production Site URL and exact redirect allowlist;
- custom Resend SMTP;
- sensible token expiry/rate limits;
- anonymous sign-in disabled unless explicitly needed (it is not needed);
- no public sign-up profile assumption;
- admin MFA/re-auth configured where current platform supports it.

### Storage

- private staging bucket;
- sanitized public logo bucket/path only;
- size/type restrictions and RLS/grants;
- signed upload expiry;
- cleanup process.

### Plan

Free tier is development/private testing only. Use Pro before live money for non-pausing operation/backups/supportable production posture. Verify current pricing/limits at launch.

---

## 18. Cashfree/provider deployment

### Before credentials

Provide merchant underwriting with truthful product explanation/screens/Terms:

- digital sponsored advertising placement;
- public cumulative paid ordering;
- no wager, prize, participant payout, wallet or resale;
- content/moderation/refund policy;
- expected ticket sizes/volume/customer type.

Obtain written approval. Do not rely solely on successful technical API access.

### Sandbox

- separate app/credentials/webhook secret;
- exact official API version;
- all status/refund/duplicate/delayed flows tested;
- raw fixtures recorded/redacted;
- webhook retries observed;
- idempotency/retrieval proven.

### Production

- live secrets only in production;
- exact HTTPS webhook and return URLs;
- signature/timestamp verification;
- provider dashboard alerts/contact;
- settlement/refund/chargeback reports accessible;
- low-value controlled launch transaction;
- daily reconciliation from day one.

### Provider replacement

A replacement provider must implement the internal adapter, contract suite and receive equivalent merchant/legal approval. Do not change ledger/ranking rules to fit provider naming.

---

## 19. Resend/email operations

- verify sender domain;
- SPF/DKIM and DMARC policy;
- custom SMTP for Supabase Auth;
- API key for transactional domain emails;
- templates versioned/reviewed;
- safe support/contact reply address;
- bounce/complaint handling;
- recipient suppression and lawful communication rules;
- outbox retries/dead letters monitored;
- no magic-link/token in logs/Sentry.

Email failure must never alter payment state.

---

## 20. Turnstile operations

- production site/secret keys restricted to expected domains where supported;
- action/hostname verification server-side;
- documented test keys for CI/staging;
- monitor error codes/pass rate;
- challenge only at useful risk points to avoid conversion damage;
- retain rate limits even when Turnstile passes;
- rotate secret through runbook.

---

## 21. Monitoring and alerts

### Financial correctness — page immediately/high priority

- ledger/listing total mismatch;
- provider success without ledger beyond threshold;
- ledger success without provider settled evidence;
- amount/currency/order/environment mismatch/quarantine;
- duplicate-paid provider payment;
- effective adjustment unapplied;
- negative-total attempted/invariant violation;
- webhook signature failure spike/delivery outage;
- reconciliation failure/stale run;
- payment fulfilment transaction error spike.

### Availability/performance

- elevated 5xx/errors;
- DB connection/pool/lock/CPU/storage pressure;
- webhook/status/checkout latency;
- public board cache hit/latency;
- function timeouts;
- email outbox backlog/failure;
- storage sanitisation backlog;
- auth/magic-link failure;
- cron/reconciliation missed.

### Abuse/security

- report/checkout/magic-link/upload velocity anomalies;
- admin failed auth/role changes;
- operational flag changes;
- unusual suspension/refund volume;
- CSP violations/secrets scan alerts;
- repeated private URL/upload attack patterns.

### Business (not rank inputs)

- sponsor starts -> checkout -> confirmed conversion;
- average sponsorship/raise;
- repeat raises;
- payment-method/provider failure distribution;
- organic shares/outbound clicks;
- refund/chargeback/content-report rates.

Do not expose confidential identifiers in general analytics.

---

## 22. Logging and retention

Structured logs include request/correlation/internal public-safe IDs, state/error code and latency. Exclude email/plain IP, provider secrets, raw bodies, auth tokens/magic links, payment instrument and report/admin content.

Retention tiers should be decided with counsel/accounting:

- operational logs: shortest useful period;
- click dedupe: ~8 days by product rule;
- public aggregates: longer, non-personal;
- financial/provider/invoice/audit: legal/accounting period;
- reports/moderation/contact: documented purpose-based period;
- staged uploads: hours/days until cleanup;
- backups: documented rolling period.

A deletion/data-request workflow must distinguish erasable personal data from legally retained financial/audit records and anonymise where lawful.

---

## 23. Backup and recovery

### Objectives

Initial production targets (confirm against plan capabilities and business risk):

- **RPO:** aim <= 24 hours at absolute baseline; preferably much lower/PITR with Supabase Pro/current feature.
- **RTO:** aim <= 4 hours for service recovery, with public read-only restoration sooner where possible.
- Financial reconciliation with provider can reconstruct missing settlement events, but is not a substitute for database backup.

### Backup verification

- know automatic backup/PITR schedule and retention;
- periodic logical export of schema/config/reference data where appropriate and securely encrypted;
- no secrets embedded in backups beyond DB data protections;
- restore to isolated non-production environment at least quarterly and before launch/high-risk changes;
- run migrations/app smoke/reconciliation on restored DB;
- record restore duration/evidence.

### Critical warning

Never resolve an incident by restoring an older database over newer provider transactions without a forensic reconciliation plan. Payments may have occurred after backup. Prefer read-only/payments-off, restore/copy, compare provider evidence and apply forward repairs.

---

## 24. Scheduled jobs

Use Vercel Cron or current approved scheduler; endpoints are authenticated and idempotent.

Suggested schedule:

| Job                               | Launch cadence             | Purpose                         |
| --------------------------------- | -------------------------- | ------------------------------- |
| pending payment reconciliation    | every 5–15 min             | recover delayed/missed status   |
| payment/adjustment reconciliation | hourly + daily full window | financial correctness           |
| projection audit                  | daily                      | ledger/listing/daily equality   |
| email outbox drain                | every minute/frequent      | transactional delivery          |
| asset staging cleanup             | hourly/daily               | delete expired/orphaned uploads |
| click dedupe cleanup              | daily                      | enforce retention               |
| rate bucket cleanup               | daily/hourly               | remove expired rows             |
| stale attempts cleanup/state mark | hourly                     | UI/ops hygiene                  |
| backup/restore reminder/evidence  | scheduled operational task | recovery assurance              |

Cron overlap is safe through row locks/run identity/advisory lock where needed. A missed job alerts after grace period.

---

## 25. Operational dashboards

### Founder daily dashboard

- total confirmed volume/count;
- pending/quarantined/duplicate-paid;
- refunds/chargebacks;
- reconciliation status/mismatches;
- top/Today real board movement;
- reports/moderation queues;
- email failures;
- DB/provider/application health;
- abuse spikes.

### Incident dashboard

- current operational flags;
- last webhook/event/provider status;
- attempt/payment/ledger chain by safe search;
- queue/backlog;
- deployment/migration/config version;
- recent admin actions;
- provider/Supabase/Vercel status links.

Access is admin-only and no-store.

---

## 26. Runbook: payment returned but still pending

1. Search attempt public/internal ID; never ask for card details.
2. Check attempt/provider order/payment/event rows.
3. Query provider through approved reconciliation service/dashboard.
4. If provider pending: leave pending, communicate expected follow-up.
5. If provider succeeded and no ledger: run/retry idempotent fulfilment service; never direct total update.
6. If mismatch: keep quarantined, collect provider evidence, do not rank.
7. Verify one ledger entry, total/daily projection, actual rank, email.
8. Record resolution/audit/support reference.

---

## 27. Runbook: duplicate charge/payment

1. Identify distinct provider payment IDs under the same order/attempt.
2. Confirm first valid fulfilment and that second produced no ledger sponsorship.
3. Mark/verify duplicate-paid quarantine.
4. Follow provider/refund policy to refund extra payment through audited two-stage request.
5. Wait for effective provider adjustment; do not lower listing total for refund of a payment that never added sponsorship.
6. Reconcile and notify customer.

This distinction is crucial: an unfulfilled duplicate charge refund must not subtract from the listing's legitimate sponsorship.

---

## 28. Runbook: total/ledger mismatch

1. Set payments/read-only flags if scope/ongoing risk is uncertain.
2. Preserve evidence and current deployment/config versions.
3. Calculate immutable ledger sum and inspect recent entries/provider events.
4. Determine whether projection only is wrong or ledger event is missing/incorrect.
5. Projection wrong: audited projection repair from ledger.
6. Provider-confirmed event missing: apply through normal idempotent service.
7. Conflicting/unknown evidence: quarantine and escalate; do not edit ledger.
8. Rebuild Today projection where affected.
9. Invalidate caches, run full reconciliation, document incident/root cause/tests.

---

## 29. Runbook: webhook outage/signature failures

1. Disable new payments if provider events cannot be safely authenticated/recorded and outage is material.
2. Check recent deployment, secret rotation, provider API/signature version, raw-body handling and provider dashboard.
3. Do not weaken/skip signature verification.
4. Restore prior known-good code/secret overlap if safe.
5. Reconcile missed provider payments/events for outage window.
6. Verify idempotent replay produces one ledger entry each.
7. Rotate compromised secret and document.

---

## 30. Runbook: provider outage/order-create timeout

1. Stop repeated blind order creation.
2. Retrieve by deterministic provider order ID/idempotency key.
3. If order exists, store/resume it.
4. If provider confirms no order and retry is safe, create with same idempotency identity.
5. Keep attempt pending/failed-safe; no board change.
6. Display honest provider-unavailable message and preserve draft.
7. Monitor provider status and reconcile pending attempts.

---

## 31. Runbook: database outage

1. Public cached pages may remain; enable maintenance/read-only/payments-off.
2. Dynamic checkout/manage/admin fail closed.
3. Webhooks must return 5xx if they cannot durably record, allowing provider retry.
4. Check Supabase status, connection pool/exhaustion, recent migrations/config.
5. Recover service without accepting client-side fallback writes.
6. Reconcile provider window after restoration.
7. Verify ledger/projections before re-enabling payments.

---

## 32. Runbook: malicious/suspended listing

1. Admin authenticates/reviews evidence.
2. Suspend immediately with reason/audit; do not alter money.
3. Verify absent from Main/Today/category/detail/index/redirect and raises blocked.
4. Preserve destination/content/provider/owner evidence with privacy controls.
5. Contact owner/law/provider as required by reviewed policy.
6. Remove/unsuspend only through audited process.
7. Refund only if legally/provider/policy required and through provider-driven adjustment path.

---

## 33. Runbook: secret compromise

1. Disable affected operation/payments/admin as needed.
2. Rotate provider/database/Supabase/Resend/Turnstile/Sentry/cron/HMAC secret using platform procedure.
3. Invalidate/revoke old sessions/keys where possible.
4. Support overlap/current+previous key only where designed (e.g. click HMAC), never indefinitely.
5. Audit logs/provider events/admin actions for abuse.
6. Reconcile financial state.
7. purge exposed secret from git/history/logs and redeploy;
8. document disclosure/legal steps.

---

## 34. Runbook: rollback and bad deployment

- Use Vercel rollback for code when schema remains compatible.
- Disable money-changing features first when uncertain.
- Do not roll back database to an old snapshot over new payments.
- Use forward migration/fix for schema/data.
- Verify webhooks during rollback: provider may continue sending.
- Reconcile the deployment interval.
- Re-enable flags gradually after tests.

Every incident gets a concise postmortem: impact, timeline, detection, root cause, resolution, financial reconciliation, preventive tests/controls and owner.

---

## 35. Legal/accounting operational gates

Before launch, obtain Indian professional review for:

- business entity/provider KYC;
- sponsored advertising disclosure/ASCI applicability;
- Terms and variable-rank/no-guarantee contract;
- refund/cancellation/chargeback handling;
- DPDP notice/consent/rights/security/breach/grievance/retention;
- consumer/e-commerce/intermediary/content obligations;
- GST registration threshold/application, invoice fields, tax rate/classification, place of supply, export implications and settlements;
- records retention and dispute response;
- provider prohibited/restricted categories.

Codex implements reviewed requirements; it does not invent legal conclusions. Store version/effective date/acceptance records for policies shown at checkout.

---

## 36. Cost and capacity operations

Expected fixed launch base, subject to current public prices/taxes:

- Vercel Pro roughly US$20/month;
- Supabase Pro roughly US$25/month;
- domain already owned/renewal;
- email/monitoring often within starter allowances initially;
- gateway fee per transaction + GST;
- possible company/legal/accounting costs.

Do not model Cashfree promotional 0% pricing as permanent. Model standard public rate/negotiated written contract. Track contribution margin by amount because ₹499 transactions have percentage/tax/support/refund costs.

Set budget alerts on Vercel, Supabase, Resend, Sentry and provider where available. Review cache/egress/storage/function/database use monthly.

---

## 37. Production launch checklist

### Business/provider/legal

- [ ] Merchant entity/account approved.
- [ ] Written provider approval of exact model.
- [ ] Live credentials and settlement bank verified.
- [ ] Terms/Privacy/Refund/Content/How-it-works approved.
- [ ] Sponsored ranking/no-guarantee disclosure visible.
- [ ] GST/invoice/accounting process approved.
- [ ] grievance/support/contact process staffed.

### Infrastructure

- [ ] Vercel Pro and Supabase Pro in intended regions.
- [ ] production/staging completely isolated.
- [ ] domain/TLS/canonical redirects.
- [ ] Auth redirect allowlist and Resend DNS/custom SMTP.
- [ ] provider webhook/return URLs and secrets.
- [ ] backups/PITR/restore evidence.
- [ ] operational flags/cron/alerts/dashboard.

### Security

- [ ] grants/RLS/advisors reviewed.
- [ ] owner/admin IDOR and role tests.
- [ ] admin MFA/re-auth/audit.
- [ ] raw-body signature/semantic/idempotency/concurrency tests.
- [ ] CSP/headers/Turnstile/rate limits.
- [ ] upload/URL/open redirect/SSRF controls.
- [ ] secrets/PII logging and client-bundle audit.
- [ ] no unresolved high/critical issue.

### Product/quality

- [ ] all phase acceptance criteria pass.
- [ ] mobile/desktop/accessibility/performance.
- [ ] empty production has no fake data.
- [ ] pending/confirmed/refund/moderation copy truthful.
- [ ] actual rank/share claims verified.
- [ ] reconciliation can repair a deliberately introduced staging mismatch.

### Controlled live certification

- [ ] payments initially disabled.
- [ ] deploy/migrate/smoke read/auth/admin.
- [ ] one legitimate controlled low-value live transaction.
- [ ] one provider payment -> one attempt -> one ledger -> exact total/Today/board/email.
- [ ] provider settlement/reconciliation verified.
- [ ] gradual enablement and monitoring.

---

## 38. Ongoing cadence

### Daily

- reconciliation success/mismatches;
- quarantines/duplicates/refunds/chargebacks;
- provider/webhook/payment conversion health;
- reports/moderation;
- outbox/cron failures;
- security/abuse alerts.

### Weekly

- database connections/locks/slow queries/storage;
- cache/function/egress/cost;
- admin/audit/role review;
- dependency/security updates;
- content/provider risk;
- support issue patterns.

### Monthly

- contribution margin/refund/chargeback/provider fees;
- access/secrets/retention cleanup;
- capacity/performance/index review;
- restore/recovery evidence (quarterly minimum full drill);
- legal/provider policy change review;
- incident action completion.

### Before every release

- migration/backup/rollback;
- provider contract/version impact;
- financial duplicate/concurrency suite;
- public/private cache/data audit;
- security/accessibility/browser smoke;
- release evidence.

---

## 39. Operational definition of healthy

GoneViral is healthy when:

- every provider-settled sponsorship maps to exactly one ledger fulfilment or a visible quarantine;
- every effective provider adjustment maps to exactly the required net ledger delta;
- listing/daily projections equal ledger sums;
- no payment state silently waits beyond reconciliation thresholds;
- public boards are fast and truthful;
- owner/admin boundaries hold;
- reports/abuse are manageable;
- backups restore and incidents can disable writes safely;
- costs and gateway fees remain understood;
- the founder can diagnose a payment by correlation ID without reading raw secrets/PII.
