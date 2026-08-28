# 04 — Codex Implementation Plan

**Purpose:** build GoneViral.in sequentially without inventing rules  
**Execution rule:** complete, verify, commit and report one phase before starting the next

---

## 1. How Codex must work

For every phase:

1. Read this plan plus all referenced authoritative sections.
2. Inspect the repository/current environment; do not assume earlier work exists.
3. Verify current APIs/versions in official documentation and Context7 where needed.
4. Write/update a short phase plan and acceptance checklist.
5. Implement the smallest coherent vertical slice.
6. Add tests before calling the phase complete.
7. Run required quality/security checks.
8. Visually verify relevant pages with a real browser at desktop/mobile widths.
9. Update durable project documentation and `.env.example` without secrets.
10. Commit with a descriptive message; leave worktree clean.
11. Report changed files, decisions, commands/tests and any remaining blocker.
12. Do not start the next phase unless acceptance criteria pass.

### Stop conditions

Stop and report rather than guessing when:

- a product rule conflicts with `00`;
- provider/official API behaviour is ambiguous;
- a migration would destroy/rewrite financial history;
- required merchant/legal approval is missing for live mode;
- a security control must be weakened;
- a test exposes ledger/idempotency/concurrency uncertainty.

Sandbox/local work may continue with provider mocks while live launch gates remain closed.

---

## 2. Definition of done for every phase

A phase is done only when:

- TypeScript compiles in strict mode;
- lint/format/type/unit tests pass;
- new critical paths have tests, not just code;
- no secret/PII leaked into client bundle/logs/fixtures;
- browser verification completed for UI work;
- accessibility basics checked for UI work;
- migrations apply to a clean database and existing phase database;
- docs/env/example/run commands are current;
- no TODO represents a missing acceptance requirement;
- worktree is clean and the phase commit is identifiable.

“Page renders” is not enough. “Webhook endpoint returns 200” is not enough. Financial phases require invariants, duplicate/concurrency tests and database verification.

---

# Phase 0 — Repository, research verification and engineering guardrails

## Objective

Create a clean reproducible Next.js foundation with pinned versions and no product implementation assumptions.

## Verify before coding

Using official docs/Context7, record exact selected versions and relevant API rules for:

- current patched Node 24 LTS;
- Next.js 16 App Router/React compatible patch;
- Next.js `proxy.ts`, async request APIs, cache tags and Node runtime;
- Tailwind CSS 4 integration;
- Drizzle ORM/Kit + `postgres.js` + Supabase transaction pooler;
- Supabase SSR Auth (`@supabase/ssr`), current publishable/secret key terminology;
- Vitest/Playwright/Sentry integrations.

Create `docs/TECH_VERSION_DECISIONS.md` with dates, links and chosen exact versions. Pin dependencies and commit lockfile.

## Build

- Next.js App Router, TypeScript strict, pnpm.
- `src/` and repository layout from `02`.
- ESLint + Prettier (or a documented single formatter/linter approach).
- Vitest and Playwright scaffolding.
- Tailwind 4 and semantic CSS variables from `01`.
- Geist via `next/font`.
- Zod environment validation separated into public/server schemas.
- `server-only` boundaries for database/secrets.
- basic `instrumentation.ts`/structured logger abstraction, initially local-safe.
- root error/not-found/loading shells.
- `.env.example`, `.gitignore`, README local commands.
- CI workflow for install, format/lint, typecheck, unit test, build and secret scan.
- dependency update policy; no floating major versions.

## Required tests/checks

```text
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Browser-check `/` at 1440×900, 390×844 and 320×568; verify no console/hydration error.

## Acceptance

- [ ] Clean install/build reproducible.
- [ ] Exact versions pinned and documented.
- [ ] No production secret values or accidental client env exposure.
- [ ] Strict TypeScript and CI pass.
- [ ] Initial visual token page proves typography/colour/focus/reduced-motion base.
- [ ] No database/payment/provider dependency is faked as production-ready.

---

# Phase 1 — Domain policy and pure calculations

## Objective

Encode `00` once as testable pure domain law before database/UI/provider work.

## Build

### `src/domain/policy.ts`

Versioned policy constants:

```text
Asia/Kolkata
INR
₹499/49_900
₹1,000/100_000
10/100
₹1 takeover increment/100 paise
whole-rupee granularity
field/upload/expiry limits
```

### `money.ts`

- branded `MoneyPaise`/safe bigint helpers;
- strict whole-INR parser;
- add/subtract/compare/max/ceil-div;
- Indian INR formatter (server/client deterministic);
- JSON serializer/deserializer as decimal strings;
- provider amount conversion boundary.

### `ranking.ts`

- minimum initial sponsorship;
- minimum later raise from original;
- takeover quote;
- deterministic comparator;
- estimated rank over a snapshot;
- no `number` conversion.

### `today.ts`

- UTC timestamp -> IST business date;
- business-day boundaries;
- daily delta logic.

### `listing.ts` / `payment.ts`

- lifecycle/moderation/public-eligibility functions;
- allowed attempt state transitions;
- monotonic provider status mapping contract;
- pure validation error codes.

## Required tests

Use exhaustive table tests and property/fuzz tests where useful.

Must cover:

- ₹498 reject; ₹499 accept;
- ₹499/₹8,000 minimum raise ₹1,000;
- ₹10,000 -> ₹1,000;
- ₹10,001 -> ₹1,001;
- ₹25,005 -> ₹2,501;
- takeover tie +₹1 rule;
- quote lower bounded by raise minimum;
- amounts beyond JS safe integer remain exact;
- negative/decimal/scientific/overflow inputs reject;
- Indian grouping;
- equal-total reached-time/ID ordering;
- IST midnight, leap date and DST-independent behaviour;
- lifecycle/moderation eligibility matrix;
- success cannot regress to failed.

## Acceptance

- [ ] No money calculation uses JavaScript `number`.
- [ ] All examples/invariants in `00` pass.
- [ ] UI/database/provider code can import these rules without duplicating constants.
- [ ] Property tests prove rounding/monotonicity for broad original values.
- [ ] Policy version is attached to calculation results/attempt inputs where required.

---

# Phase 2 — Database foundation, migrations and ordinary repositories

## Objective

Create private, constrained PostgreSQL schema and a reproducible Supabase workflow before financial transactions.

## Prerequisites

- local PostgreSQL/Supabase CLI or dedicated development Supabase project;
- separate `DATABASE_URL` pooler and `DATABASE_DIRECT_URL` migration connection;
- no production database.

## Build

- Drizzle configuration and server-only `postgres.js` runtime client (`prepare:false`).
- schemas/tables/enums/checks/indexes from `03`.
- seed migration for six categories.
- append-only privileges/protection for ledger/audit.
- public-safe repository query types; private repository modules.
- migration/test database reset commands.
- scripts to verify migration list/schema invariants.
- generated DB types only where they do not replace domain types.

Initial tables include all required core, owner, payment/provider, ledger/daily, moderation/audit, clicks/email/reconciliation tables. It is acceptable to create low-use later tables now to establish schema integrity; do not build their UI yet.

## Security work

- place tables in `app`/`private`, not exposed `public`.
- revoke public/anon/authenticated access not explicitly needed.
- inspect Supabase Data API settings.
- run Supabase database/security advisors.
- avoid unsafe `SECURITY DEFINER`/RLS shortcuts.

## Required tests

- migration applies from empty database;
- migration applies/upgrades from prior Phase state;
- category seeds exact and idempotent;
- constraints reject negative/non-whole money/invalid states;
- unique canonical destination/provider IDs/fulfilment constraints work;
- ordinary server role can perform intended operations;
- anon/authenticated/public roles cannot directly read private/domain tables;
- application role cannot update/delete ledger/audit;
- `bigint` maps correctly through driver.

## Acceptance

- [ ] Clean database can be created by documented commands.
- [ ] Schema matches `03`, including indexes/foreign keys.
- [ ] No table is silently exposed through Supabase Data API.
- [ ] Drizzle migration SQL is committed/reviewed.
- [ ] Supabase advisors have no unresolved critical security findings.
- [ ] No payment total is yet updated outside future transaction service.

---

# Phase 3 — Public read model and premium board UI

## Objective

Ship the truthful, fast, accessible product shell using database-backed public projections, initially with local/test fixtures only.

## Build

### Queries

- Main deterministic ranking.
- Category filtered ranking.
- Today join/order by explicit IST business date.
- listing public detail.
- current takeover quote/estimated rank query.
- pagination/top N with stable keys.
- strict public DTO allowlist.

### Routes/UI

- `/`, `/today`, `/category/[slug]`, `/l/[slug]`.
- compact header/navigation/footer.
- mandatory plain paid-ranking disclosure.
- responsive board/table/cards.
- exact INR amounts and takeover CTAs.
- real empty/low-population states.
- listing detail/public movement placeholder only where real data exists.
- static How it works/legal placeholders clearly marked for counsel before production.
- metadata/OG baseline without fake claims.

### Caching

- public cache tags from `02`;
- business-date-aware Today cache;
- no private data inside cached functions;
- manual refresh/stale notice.

### Fixture policy

Synthetic fixture seeding is local/test only. The production path with empty database shows the truthful empty state.

## Required tests

- SQL/integration tests for order, ties, hidden states, categories and Today.
- DTO snapshot/security test proving private columns absent.
- unit tests for all takeover buttons.
- Playwright desktop/mobile board navigation, category tabs, listing detail.
- axe + keyboard/focus/200% zoom/reduced motion.
- production-mode empty DB screenshot/test proves no fake data.
- Lighthouse/Next build baseline; no hydration errors.

## Acceptance

- [ ] Board begins in first viewport desktop and is usable at 320px.
- [ ] Main/Today/category definitions are explicit.
- [ ] Suspended/removed/inactive-reversed listings are absent.
- [ ] Quote is labelled current estimate/not reservation.
- [ ] Public cache/HTML/RSC payload contains no private data.
- [ ] Design matches `01`, not generic SaaS/casino/crypto.
- [ ] No direct client database query exists.

---

# Phase 4 — Guest listing intent, destination safety and hosted sandbox checkout

## Objective

Allow a guest to create a validated provisional listing and one idempotent sandbox checkout order, without yet treating browser return as confirmation.

## Provider gate

Implement Cashfree adapter against current official sandbox docs. Keep a mock provider for deterministic tests. Live mode remains feature-disabled pending written approval.

## Build

### Join form

- listing/name/tagline/destination/category/email;
- optional logo deferred to Phase 8 if desired;
- amount presets/custom whole INR;
- target snapshot and disclosures;
- concise benefit copy: `Pay to be on the GoneViral.in leaderboard. Get seen.`
  and `People click your listing and go straight to your website.`;
- explain the no-account first checkout as `No sign-up. No API. No nonsense.`;
- accessible multi-step UI with preserved validation state.

### Safety

- URL parser/canonicaliser and duplicate destination handling;
- versioned deterministic submission screening: prohibited text/claim rules, destination/category denylists and risk signals; low-risk auto-clear, ambiguous pending review;
- content/field limits;
- Turnstile server verification;
- IP/email/destination/application rate limits;
- terms/policy acceptance version snapshot;
- no owner enumeration.

### Attempt creation

- application idempotency key;
- Transaction A for listing/pending owner/attempt;
- provider creation outside DB transaction;
- Transaction B storing provider order/session;
- deterministic provider order ID/idempotency;
- retry/resume logic after unknown timeout;
- short-lived checkout expiry;
- public safe attempt ID.

### Routes

- public `/join` and attempt context route;
- create checkout mutation/route;
- provider return to `/join/[publicId]/pending` only;
- minimal no-store status endpoint returning pending/failed-safe states, with no fulfilment yet.

## Required tests

- valid first amount/category/URL/email/provider-required phone creates one attempt/order;
- missing/invalid provider-required phone rejects without creating an order; phone never appears in public projections/logs;
- invalid/private/IP/credentials/non-HTTPS URL rejects;
- duplicate canonical destination produces one listing and safe recovery UI;
- duplicate browser submit/network retry returns same attempt/order;
- wrong/tampered amount/target/client rank ignored/recalculated;
- Turnstile success/failure/timeout/reuse;
- provider timeout then retrieve-existing path;
- preview/sandbox/live environment separation;
- pending return explicitly says provider verification, no rank change.

## Acceptance

- [ ] Guest can reach hosted sandbox checkout.
- [ ] Browser return cannot write ledger/activate/rank.
- [ ] One user retry cannot create duplicate intent/provider order.
- [ ] Destination uniqueness is database-enforced.
- [ ] Live checkout is disabled and impossible without production flag/secrets/approval.
- [ ] Sensitive fields are private and redacted from logs.

---

# Phase 5 — Webhooks, immutable ledger and first real ranking movement

## Objective

Implement the authoritative, idempotent server-to-server confirmation path for first sponsorships.

## Build

- raw-body webhook Route Handler at provider-specific path;
- signature/timestamp verification from current official docs;
- normalized provider event/payment adapter;
- provider_events/provider_payments idempotent persistence;
- exact semantic validation of order/amount/currency/environment/status;
- locked fulfilment transaction from `03`;
- first positive ledger entry;
- atomic listing total/original/reached time/lifecycle/category lock;
- atomic Today projection;
- attempt/provider/event terminal state;
- cache invalidation after commit;
- durable confirmation/claim email outbox insertion;
- no-store pending status polling and confirmed result page;
- actual post-commit rank/result copy.

## Required tests

### Signature/contract fixtures

- provider official/recorded sandbox payload fixture validates;
- mutated body/header/timestamp fails;
- raw bytes preserved;
- unknown authentic event quarantines.

### Idempotency/semantics

- same event repeated N times -> one ledger entry;
- different event IDs same payment -> one fulfilment;
- wrong amount/currency/order/environment -> no ledger, durable quarantine;
- attempt created before suspension/removal then genuinely settles -> financial ledger applies once, public stays hidden and operations review is created;
- failed/dropped then success -> success applies;
- success then failure -> success remains;
- late success after local expiry -> applies;
- browser callback/query alone -> no ledger.

### Database

- total equals ledger sum;
- original set once;
- reached time/database business date correct;
- hidden moderation prevents public display without losing confirmed financial state;
- cache invalidation failure does not roll back financial state.

### E2E

- sandbox/mock complete payment -> pending -> confirmed -> board changes;
- actual rank differs from estimate scenario copy;
- no confirmation/celebration before commit.

## Acceptance

- [ ] Exactly one sponsorship is applied per valid attempt.
- [ ] Invalid/mismatched events cannot alter total/rank.
- [ ] Browser/client has zero authority.
- [ ] Confirmed result shows database truth.
- [ ] All invariants/reconciliation spot-checks pass.
- [ ] Webhook responds according to duplicate/quarantine/transient-error rules.

---

# Phase 6 — Passwordless ownership claim and owner dashboard

## Objective

Let the verified payer email securely claim/manage the listing after confirmation, without passwords or owner enumeration.

## Build

- current Supabase SSR clients and `proxy.ts` session refresh pattern;
- `/auth/callback` PKCE code exchange with relative redirect allowlist;
- Resend custom SMTP configuration documentation;
- generic manage magic-link request form;
- pending owner claim transaction matching canonical verified email;
- active `listing_owners` relationship;
- owner dashboard/listing overview/payment history;
- server-side `requireOwner` predicate used by every owner read/mutation;
- safe sign-out and session error handling.

## Required tests

- correct verified email can claim once;
- wrong email/user cannot claim;
- response does not reveal whether email exists;
- auth callback rejects external `next` open redirect;
- non-owner cannot access by changing slug/ID/API payload;
- revoked owner loses access;
- session/cookie handling works across refresh/preview/prod configuration;
- no reliance on editable `user_metadata`;
- owner pages are no-store and absent from public cache.

## Acceptance

- [ ] First sponsor can securely manage after email link.
- [ ] Ownership is a database relationship, not email string in browser.
- [ ] IDOR tests pass for every owner route/mutation.
- [ ] Auth emails work through approved production SMTP in staging.
- [ ] No password UX or public owner identity leakage.

---

# Phase 7 — Raises, takeover quotes and full concurrency semantics

## Objective

Implement owner raises based on immutable original sponsorship and make the board's public takeover actions reliable.

## Build

- owner-only raise route/form;
- server-calculated minimum from original;
- exact target quote endpoint/UI;
- attempt snapshot fields and purpose validation;
- provider sandbox checkout through same adapter;
- webhook fulfilment of `raise` ledger entry;
- concurrent listing lock/increment;
- updated Today/Main/category/listing invalidation;
- actual movement result/share-ready data.

Public `Take #N` for a new entity remains the initial sponsor flow; it does not add money to the target listing.

## Required tests

- all rounding examples in `00` through UI/server/DB;
- original never changes after multiple raises;
- current total not used for minimum;
- amount below minimum rejects at create and fulfilment layers;
- target quote uses +₹1 and lower bound;
- equal target total does not pass;
- board moves after quote: paid amount adds and actual result shown;
- two separate valid raises settling concurrently both count;
- same attempt duplicate still counts once;
- owner cannot raise suspended/removed listing;
- non-owner raise blocked.

Use parallel integration tests against real PostgreSQL transactions, not only mocked calls.

## Acceptance

- [ ] Minimum formula is identical across domain/UI/server/database snapshots.
- [ ] Two valid concurrent raises produce arithmetic sum with no lost update.
- [ ] Quotes never reserve or auto-increase charge.
- [ ] Actual confirmed rank is truthful.
- [ ] All relevant board caches refresh/invalidate.

---

# Phase 8 — Safe logos, edits and sensitive change review

## Objective

Add optional visual identity and owner edits without enabling stored XSS, malware, SSRF or listing identity hijack.

## Build

### Upload

- private staging bucket/prefix;
- short signed upload intent bound to draft/owner;
- finalisation checks object/size/magic/type/dimensions/frame count;
- Sharp decode/re-encode, metadata strip, fixed safe variants;
- sanitized public bucket/path;
- asset state and replacement cleanup;
- orphan cleanup scheduled job.

### Edits

- immediate low-risk tagline/logo/minor name/same-host path updates;
- reviewed change requests for destination host/category/material identity;
- old safe value stays live;
- admin review queue hooks (full admin in Phase 10);
- cache invalidation after approved/immediate change;
- canonical destination unique constraint and manual-reassignment path.

## Required tests

- JPEG/PNG/WebP valid;
- SVG/GIF/unknown/polyglot/oversize/decompression/pixel bomb rejected;
- metadata stripped; staging never public;
- object/path cannot be chosen by client;
- unauthorized finalisation/replacement blocked;
- post-payment destination host cannot change immediately;
- same-host allowed path rule works;
- duplicate canonical destination change rejects;
- category remains locked until approved admin mutation;
- public projection uses ready sanitized asset only.

## Acceptance

- [ ] Logos are sanitized, bounded and optional.
- [ ] No arbitrary remote image or server-side destination fetch exists.
- [ ] Sensitive changes are reviewed/audited, not silently applied.
- [ ] Old public identity remains safe during review.
- [ ] Cleanup prevents private staging accumulation.

---

# Phase 9 — Refunds, chargebacks, restorations and reconciliation

## Objective

Complete post-settlement financial correctness without mutating historical entries.

## Build

- provider adjustment normalisation;
- provider_adjustments desired/applied delta model;
- locked adjustment transaction;
- negative refund/chargeback and positive restoration ledger entries;
- total/current reached time/Today/lifecycle changes;
- owner notification/status history;
- duplicate/out-of-order adjustment handling;
- provider payment aggregate reversal limits;
- scheduled reconciliation for payments/adjustments/projections;
- reconciliation DB records/admin-visible exceptions;
- projection repair command using ledger authority;
- operational alerting.

No admin refund UI yet unless safely included behind disabled flag; the transaction must be provider-state-driven.

## Required tests

- partial reversal lowers total/rank;
- remaining total below ₹499 stays active;
- full reversal -> inactive_reversed, original/history preserved;
- restoration -> positive total/active when otherwise eligible;
- reversal resets tie time;
- Today receives application-day delta, not historical rewrite;
- duplicate refund event no-op;
- adjustment state changes apply only delta-to-apply;
- refund before/after payment events converge;
- impossible over-refund quarantines, never negative total;
- refund of an unfulfilled duplicate-paid charge records settlement adjustment but does not subtract listing sponsorship;
- ledger/listing/daily reconciliation finds deliberate drift;
- projection repair restores exact values without ledger edit;
- provider success missing ledger is applied through normal service.

## Acceptance

- [ ] Every effective provider adjustment changes rank exactly once.
- [ ] Total can never go negative.
- [ ] Original successful sponsorship never changes.
- [ ] Reconciliation produces durable runs/items and alerts critical mismatch.
- [ ] No direct total-only correction path exists.

---

# Phase 10 — Moderation, reports and admin operations

## Objective

Give the founder safe, auditable control over public eligibility and payment exceptions.

## Build

### Reports

- public report form/reasons/explanation/optional email;
- Turnstile/rate limits/dedupe signals;
- generic success;
- no automatic suspension/rank impact.

### Admin auth

- active `admin_users` server check/roles;
- MFA/re-auth/short-session guidance/config where available;
- protected no-store admin route group;
- role-based action permissions.

### Queues and detail

- moderation/reports/change requests;
- payment quarantines/duplicate-paid/pending exceptions;
- reconciliation discrepancies/email failures;
- full listing/payment/ledger/audit context with redaction.

### Actions

- clear/suspend/unsuspend/remove;
- approve/reject category/destination/name changes;
- canonical destination release/reassignment with evidence;
- resend safe confirmation/management email;
- operational flags/read-only mode;
- two-stage provider refund initiation behind disabled-by-default flag;
- append-only moderation/admin audit in same transaction.

## Required tests

- client-side route bypass cannot access admin data;
- reviewer/operations/super-admin permission matrix;
- every sensitive action requires reason and creates immutable audit;
- suspension immediately removes board/detail/redirect and blocks raises;
- unsuspension restores only if lifecycle/total valid;
- removal retains ledger/canonical identity;
- report volume alone cannot change state/rank;
- duplicate admin retry does not duplicate action/refund;
- audit cannot be edited/deleted by application/admin role;
- public/owner never see reports/internal notes/provider secrets.

## Acceptance

- [ ] All public eligibility changes are auditable and cache-invalidated.
- [ ] Money is not changed by moderation action.
- [ ] Payment exceptions are visible/actionable without direct ledger editing.
- [ ] Admin privilege is server/database enforced.
- [ ] Emergency read-only/payments-off controls work.

---

# Phase 11 — Click tracking, public activity and sharing

## Objective

Add real privacy-safe click counts to every public leaderboard card and listing
detail only after the safe redirect and aggregation path below is live. Earlier
phases must not display placeholders, fixture counts or inferred clicks.

Add honest engagement signals and viral sharing without affecting ranking or fabricating activity.

## Build

### Safe redirect/clicks

- `/go/[slug]` lookup/eligibility/revalidation;
- privacy-preserving keyed visitor HMAC by listing/IST day;
- bot/prefetch suppression;
- unique daily aggregate;
- dedupe expiry/secret rotation support;
- no arbitrary destination parameter.

### Public activity

- public-safe events produced only from committed real state;
- labels such as joined/added/took rank;
- no payer/payment/dispute/private identity;
- no fake live feed.

### Sharing

- listing/share metadata and generated OG/share image;
- actual current or explicitly timestamped rank;
- sponsorship disclosure and GoneViral domain;
- Web Share API/copy link/download image controls;
- confirmation-page victory copy from actual post-commit result.

## Required tests

- redirect blocks hidden/unsafe/missing listing;
- no `/go?url=` open redirect;
- first human click/day counts once, repeats do not;
- another day/listing counts appropriately;
- bots/prefetch do not inflate known cases;
- raw IP/email not retained;
- click aggregate never enters ranking query;
- public activity lacks private data;
- share image/copy never claims estimated/unconfirmed/fake rank;
- reduced-motion confirmation celebration.

## Acceptance

- [ ] Outbound redirects are safe and available only for eligible listings.
- [ ] Clicks are clearly labelled and have zero ranking influence.
- [ ] Activity/sharing are sourced only from real committed records.
- [ ] Privacy/retention behaviour matches legal policy.

---

# Phase 12 — Transactional email, notifications and founder support workflow

## Objective

Make confirmation, ownership and exception communication reliable without coupling it to financial transactions.

## Build

- Resend production domain configuration documentation;
- versioned templates for confirmation, magic-link prompt, adjustment, moderation/change result and verification delay;
- email outbox drainer with `FOR UPDATE SKIP LOCKED` or equivalent, idempotency and bounded retry/dead-letter state;
- authenticated/manual resend operations;
- safe support references/public IDs;
- delivery/bounce/failure visibility where available;
- Supabase Auth custom SMTP and redirect templates.

## Required tests

- ledger transaction commits even when email provider fails;
- same outbox row/provider retry sends at most one logical email;
- worker concurrency does not double-send;
- template escaping prevents user-content HTML injection;
- no secret/payment payload in email/log;
- claim link flows correctly and redirects safely;
- failed/dead letters visible to admin and resumable.

## Acceptance

- [ ] Financial correctness has no dependency on email availability.
- [ ] Every critical message is durable/idempotent.
- [ ] Owner can recover management without support revealing email existence.
- [ ] Email domain and production SMTP are authenticated before launch.

---

# Phase 13 — Observability, security hardening and failure drills

## Objective

Prove the application is diagnosable and safe under hostile/partial-failure conditions.

## Build

- Sentry server/client integration with source maps and PII scrubbing;
- structured logs/correlation IDs;
- operational metrics/alerts from `05`;
- CSP/security headers compatible with provider/Turnstile/Auth/Sentry;
- dependency/secret/static security scans;
- documented secret rotation and operational flags;
- provider/database/email/cache/storage failure handling;
- rate-limit tuning and abuse dashboards;
- health/readiness endpoints safe from data leakage.

## Drills/tests

- database unavailable during webhook -> 5xx/no false ack, later retry succeeds;
- provider timeout during order create -> retrieve/no duplicate;
- email down -> confirmation commits/outbox retries;
- cache invalidation down -> DB/confirmed page correct, TTL recovery;
- storage down -> listing/payment proceeds without logo;
- duplicate/out-of-order/replay storm;
- malicious URLs/uploads/IDOR/admin bypass/CSRF/XSS payloads;
- secret scan and client-bundle env inspection;
- operational payments-off/read-only flags;
- backup and restore rehearsal in non-production.

## Acceptance

- [ ] Alerts identify financial mismatch/quarantine/webhook outage.
- [ ] Logs correlate an attempt without exposing PII/secrets.
- [ ] CSP and security headers pass browser flows.
- [ ] Failure drills produce safe, documented behaviour.
- [ ] Restore rehearsal meets recovery objectives in `05`.
- [ ] No unresolved high/critical security finding.

---

# Phase 14 — Performance, accessibility and production-readiness polish

## Objective

Meet launch quality without changing product mechanics.

## Build/tune

- query plans/indexes for Main/Today/category/owner/admin/payment/reconciliation;
- public cache hit rate and invalidation;
- image variants/bundle/hydration reduction;
- pagination and loading stability;
- mobile/desktop/low bandwidth behaviour;
- full WCAG 2.2 AA remediation;
- legal copy hooks/version display;
- SEO metadata/sitemap/robots excluding private/admin/pending pages;
- production empty/first-listing onboarding;
- browser compatibility.

## Required checks

- Playwright matrix Chromium/Firefox/WebKit where feasible;
- 320px, common Android/iPhone, tablet, desktop;
- keyboard, screen-reader smoke, 200% zoom, reduced motion;
- Core Web Vitals/load testing targets from `05`;
- PostgreSQL `EXPLAIN (ANALYZE, BUFFERS)` on seeded realistic dataset;
- payment webhook load with duplicate/concurrent events;
- no private route/cache/indexing leak;
- no fake content/social proof.

## Acceptance

- [ ] Public board is fast and readable under launch-sized dataset/traffic test.
- [ ] Accessibility checklist passes automated and manual review.
- [ ] Financial transaction p95/lock time stays comfortably within provider timeout/retry behaviour.
- [ ] Production build has no unexpected client bundle bloat/hydration warning.
- [ ] All legal/disclosure surfaces are present pending/after counsel-approved content.

---

# Phase 15 — Staging certification and live launch

## Objective

Promote a proven, legally/provider-approved staging build to production with rollback/incident readiness.

## Hard gates

Do not enable production payments until all are true:

- written provider approval of exact sponsored advertising model;
- live KYC/entity/bank credentials;
- counsel-approved Terms/Privacy/refund/content/disclosure/grievance process;
- CA-approved GST/invoice/place-of-supply/accounting setup;
- Vercel Pro + Supabase Pro selected regions;
- production domain/DNS/TLS/email authentication;
- production webhook and reconciliation tested;
- backup/restore and incident runbooks verified;
- security/access review complete.

## Staging certification

- clean deploy from main/release commit;
- migration apply and rollback/repair rehearsal;
- full sandbox payment success/failure/dropped/delayed/duplicate/refund/restoration;
- owner claim/raise/edit/moderation/report/admin/share/click/email;
- observability/alerts;
- load/performance/accessibility/security suites;
- no staging credentials/data in production config.

## Production rollout

1. Take/verify pre-migration backup.
2. Apply migrations with reviewed release procedure.
3. Deploy with `payments_enabled=false`.
4. Smoke-test public/auth/admin/read paths.
5. Register/verify live webhook and provider domain/return URLs.
6. Run one controlled low-value live payment on a legitimate founder-owned listing.
7. Verify provider dashboard -> event -> payment -> one ledger -> total/daily -> board -> email -> reconciliation.
8. Handle that payment per accounting/refund policy.
9. Enable new listings/raises gradually.
10. Monitor launch dashboard/alerts closely and record release evidence.

## Rollback principle

Code may roll back. Applied confirmed financial history does not. Never restore an old database snapshot over newer provider transactions. Use forward fixes, reconciliation and read-only/payments-off flags during incidents.

## Acceptance

- [ ] One live controlled transaction reconciles end-to-end exactly once.
- [ ] No fake production seed data.
- [ ] Provider/legal/accounting gates recorded.
- [ ] On-call contacts/runbooks/dashboard/rollback ready.
- [ ] Launch sign-off documents commit, migration, config version and evidence.

---

# Phase 16 — Post-launch hardening and measured scaling

## Objective

Stabilise from real evidence without architecture theatre or feature bloat.

## First 72 hours

- reconcile more frequently;
- review every quarantine/duplicate-paid/adjustment;
- monitor provider success/webhook latency, DB locks/connections, cache hit rate, errors, email, abuse and support;
- keep payments-off/read-only controls immediately available;
- daily ledger/projection audit.

## First 30 days

- tune only measured limits/indexes/cache;
- review content/report/provider risk;
- review refund/chargeback behaviour and contribution margin;
- conduct access/secret/audit review;
- test restore and reconciliation again;
- archive incident/post-launch notes.

## Scaling decision ladder

1. improve query/index/projection;
2. improve CDN/cache and pagination;
3. upgrade Supabase compute/connection capacity;
4. upgrade Vercel plan/function capacity;
5. move non-financial side effects to more durable worker/queue only if outbox/cron is insufficient;
6. add realtime/Redis/separate service only after measured need and new approved architecture spec.

Do not change ranking/payment rules as an optimisation.

---

## 3. Phase dependency map

```text
0 Foundation
  -> 1 Domain law
  -> 2 Database
  -> 3 Public board
  -> 4 Guest checkout intent
  -> 5 Confirmed first payment
  -> 6 Ownership
  -> 7 Raises/concurrency
  -> 8 Assets/edits
  -> 9 Adjustments/reconciliation
  -> 10 Moderation/admin
  -> 11 Clicks/activity/sharing
  -> 12 Email hardening
  -> 13 Security/observability
  -> 14 Quality/performance
  -> 15 Launch
  -> 16 Post-launch
```

Some visual/admin shell work may be prepared earlier, but no phase may claim behaviour whose financial/security dependency is incomplete.

---

## 4. Required Codex phase completion report

Use this template:

```markdown
# Phase N complete — <name>

## What changed

- ...

## Decisions/verified docs

- exact version/API/source and why

## Database/migrations

- migration names
- constraints/indexes/verification

## Security/privacy

- controls added
- secrets/PII handling

## Tests and commands

- command: result
- integration/e2e/concurrency cases

## Browser verification

- routes/viewports/console/accessibility observations

## Acceptance criteria

- [x] ...

## Git

- branch
- commit hash
- remote status
- worktree clean

## Remaining blockers (not hidden TODOs)

- ...

Phase N+1 was not started.
```

---

## 5. Forbidden implementation shortcuts

Codex must not:

- use browser return/client callback as payment confirmation;
- use mutable current bid/latest payment model;
- calculate raise minimum from current total;
- let equal total pass earlier listing;
- use UTC/rolling 24h for Today;
- use JS `number`/floating point for money;
- update total without ledger in same transaction;
- edit/delete ledger/audit rows;
- hold row locks during provider/email/cache calls;
- expose service-role/provider secrets to browser;
- authorise from URL/email/client metadata alone;
- expose domain tables for direct public CRUD;
- add fake production entries/activity/clicks/testimonials;
- hotlink arbitrary logos or fetch arbitrary destination previews;
- add Redis/WebSockets/microservices/VPS to “future-proof”;
- enable live payments without written provider/legal/accounting gates;
- continue to next phase with failing/incomplete acceptance checks.
