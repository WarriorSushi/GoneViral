# 02 — Technical Architecture

**Depends on:** `00`, `01`  
**Deployment constraint:** Vercel + Supabase are locked  
**Architecture principle:** one small, auditable full-stack application with PostgreSQL as the domain authority

---

## 1. Architecture goals

The system must be:

- correct under duplicate, delayed and concurrent payment events;
- simple enough for one founder/Codex to operate;
- near-zero infrastructure work during development;
- cheap and resource-efficient at launch;
- read-fast for public leaderboards;
- auditable for payments, moderation and admin actions;
- replaceable at external boundaries;
- secure by default, with public/private data separation;
- scale-ready through PostgreSQL indexes, caching and stateless compute before new services.

The system is not optimised for theoretical hyperscale on day one. It is designed so that growth is handled by increasing managed plan capacity and tuning measured bottlenecks rather than rewriting the product.

---

## 2. Selected stack

| Layer                 | Selection                                  | Reason                                                                          |
| --------------------- | ------------------------------------------ | ------------------------------------------------------------------------------- |
| Runtime               | Node.js 24 LTS                             | Supported LTS line; broad provider/library compatibility                        |
| Framework             | Current patched Next.js 16 App Router      | Full-stack, Server Components, Route Handlers, cache tags, excellent Vercel fit |
| React                 | Current compatible React 19.2 patch        | Framework-supported current line                                                |
| Language              | TypeScript, strict                         | Shared types and safer money/state modelling                                    |
| Package manager       | pnpm                                       | Deterministic, efficient installs/workspaces                                    |
| Hosting               | Vercel Pro for production                  | Managed deploys, functions, CDN/cache, commercial use                           |
| Database/Auth/Storage | Supabase Pro, Mumbai                       | Managed PostgreSQL, passwordless Auth, Storage close to Indian users            |
| ORM/migrations        | Drizzle ORM + Drizzle Kit                  | Lightweight typed SQL schema/query layer; serverless friendly                   |
| PostgreSQL driver     | `postgres.js`                              | Lightweight, supported by Drizzle and pooled serverless connections             |
| Validation            | Zod                                        | Runtime validation at trust boundaries                                          |
| Styling               | Tailwind CSS 4 + bespoke components        | Fast system implementation without generic kit aesthetic                        |
| Fonts                 | Geist Sans/Mono via `next/font`            | Local optimised assets; strong numeric UI                                       |
| Payment               | Cashfree hosted checkout adapter           | India/INR/UPI fit; conditional on written approval                              |
| Email                 | Resend                                     | Transactional API + Supabase custom SMTP                                        |
| Bot protection        | Cloudflare Turnstile                       | Low-friction server-verified challenge                                          |
| Error monitoring      | Sentry                                     | server/client error and tracing coverage                                        |
| Product analytics     | Vercel Web Analytics + internal aggregates | privacy-conscious page analytics; clicks stay first-party                       |
| Unit/integration      | Vitest                                     | fast TypeScript test runner                                                     |
| Browser tests         | Playwright                                 | cross-browser/e2e/payment-flow simulation                                       |
| Accessibility         | axe integration + manual                   | automated baseline plus human checks                                            |

### Version policy

At Phase 0 Codex must verify exact current patched versions against official release/security documentation and Context7, then pin exact versions and commit `pnpm-lock.yaml`.

Do not pin to versions written in this prose if a newer compatible security patch exists on implementation day. Do not upgrade major versions mid-phase without an explicit decision.

---

## 3. Why this architecture

### Next.js App Router

The public product is read-heavy and benefits from server rendering, CDN caching and selective invalidation. Checkout/webhook/admin operations need trusted server code. App Router supports both in one deploy, avoiding a separate API service.

Use:

- Server Components for board/listing/legal/admin initial reads;
- Client Components only for forms, tabs requiring client interaction, polling and upload UI;
- Route Handlers for public JSON endpoints, webhooks, redirects, uploads and provider callbacks;
- Server Actions for authenticated same-origin owner/admin form mutations where appropriate;
- Node.js runtime for database/payment/Sharp routes;
- cache tags and explicit revalidation for public projections.

### Supabase

Use Supabase as managed infrastructure, not as the product's business-logic layer:

- PostgreSQL stores all authoritative domain/financial data;
- Supabase Auth provides passwordless user sessions;
- Storage stages/sanitizes logos;
- platform backups/metrics support operations.

Do not expose domain tables for direct browser CRUD. Do not rely on Realtime, Edge Functions, GraphQL or autogenerated REST in V1.

### Drizzle

Drizzle is appropriate because it is small, typed and close to SQL. It does not replace PostgreSQL domain reasoning.

Use Drizzle for:

- schema definitions;
- generated migrations;
- typed ordinary reads/writes;
- transaction boundaries;
- SQL fragments and result typing.

Use explicit parameterised SQL for:

- `SELECT ... FOR UPDATE` locks;
- CTEs/window ranking;
- idempotent `INSERT ... ON CONFLICT`;
- ledger/projection updates;
- advisory/operational locks if ever needed;
- reconciliation queries.

Never use unsafe string interpolation or `sql.raw` with untrusted values.

---

## 4. System context

```text
Public visitor / Owner / Admin
            |
            v
       goneviral.in
    Next.js on Vercel
       |     |     |
       |     |     +--> Resend (email)
       |     +--------> Cashfree hosted checkout/API/webhooks
       +--------------> Supabase
                         - PostgreSQL
                         - Auth
                         - Storage

Cloudflare Turnstile --> server verification
Sentry/analytics <----- privacy-filtered telemetry
```

There is one application repository and one primary web deployment. Preview/staging and production use separate external resources/credentials.

---

## 5. Trust boundaries

### Browser — untrusted

Treat every form value, hidden field, amount, target rank, listing ID, return status, upload, cookie and header as attacker-controlled.

The browser may request an operation; it cannot attest payment, ownership, price, moderation, rank or provider identity.

### Next.js server — application policy boundary

The server:

- validates input;
- resolves authenticated identity;
- recalculates pricing;
- authorises ownership/admin;
- calls providers;
- verifies webhooks;
- executes financial transactions;
- exposes only public/private projections appropriate to the requester.

### PostgreSQL — domain authority

PostgreSQL holds:

- immutable ledger;
- denormalised current totals guarded by transactions;
- payment/event idempotency;
- listing/owner/moderation state;
- audited admin history;
- daily score projections.

### Payment provider — settlement authority

The provider attests external payment/refund/chargeback state. GoneViral validates and maps it into its ledger. The provider does not directly define rank.

### Email — possession/recovery channel

Email magic links prove access to an address through Supabase Auth. Email addresses are never public or used alone without verified session for owner actions.

---

## 6. Repository layout

Recommended single app:

```text
/
├─ src/
│  ├─ app/
│  │  ├─ (public)/
│  │  │  ├─ page.tsx
│  │  │  ├─ today/page.tsx
│  │  │  ├─ category/[slug]/page.tsx
│  │  │  ├─ l/[listingSlug]/page.tsx
│  │  │  ├─ sponsor/**
│  │  │  └─ legal/**
│  │  ├─ (owner)/manage/**
│  │  ├─ (admin)/admin/**
│  │  ├─ api/
│  │  │  ├─ payments/cashfree/webhook/route.ts
│  │  │  ├─ payments/status/[publicId]/route.ts
│  │  │  ├─ uploads/logo/**
│  │  │  ├─ reports/route.ts
│  │  │  └─ health/**
│  │  ├─ go/[listingSlug]/route.ts
│  │  ├─ auth/callback/route.ts
│  │  ├─ error.tsx
│  │  ├─ global-error.tsx
│  │  ├─ not-found.tsx
│  │  ├─ layout.tsx
│  │  └─ globals.css
│  ├─ components/
│  │  ├─ board/
│  │  ├─ sponsor/
│  │  ├─ owner/
│  │  ├─ admin/
│  │  └─ ui/
│  ├─ domain/
│  │  ├─ policy.ts
│  │  ├─ money.ts
│  │  ├─ ranking.ts
│  │  ├─ today.ts
│  │  ├─ listing.ts
│  │  ├─ payment.ts
│  │  └─ errors.ts
│  ├─ server/
│  │  ├─ db/
│  │  │  ├─ index.ts
│  │  │  ├─ schema/**
│  │  │  ├─ queries/**
│  │  │  └─ transactions/**
│  │  ├─ auth/**
│  │  ├─ payments/
│  │  │  ├─ provider.ts
│  │  │  ├─ cashfree.ts
│  │  │  ├─ normalize.ts
│  │  │  └─ fulfillment.ts
│  │  ├─ email/**
│  │  ├─ moderation/**
│  │  ├─ uploads/**
│  │  ├─ security/**
│  │  ├─ cache/**
│  │  └─ telemetry/**
│  ├─ lib/
│  └─ types/
├─ drizzle/
├─ scripts/
│  ├─ reconcile.ts
│  ├─ backfill/**
│  └─ verify-env.ts
├─ tests/
│  ├─ unit/
│  ├─ integration/
│  ├─ contract/
│  ├─ e2e/
│  └─ fixtures/
├─ public/
├─ docs/
├─ proxy.ts
├─ drizzle.config.ts
├─ next.config.ts
├─ instrumentation.ts
├─ package.json
├─ pnpm-lock.yaml
└─ .env.example
```

Do not create a monorepo unless a separate package has an actual deploy/runtime consumer. A single repository keeps shared money/domain code obvious.

---

## 7. Runtime and rendering strategy

### Default runtime

Use Node.js runtime for all database, provider, email, Sharp and admin work. Do not use Edge runtime for financial code.

### Public routes

| Route              | Rendering/cache                        |
| ------------------ | -------------------------------------- |
| `/`                | cached server-rendered Main projection |
| `/today`           | cached by IST business-date tag/key    |
| `/category/[slug]` | cached public projection               |
| `/l/[slug]`        | cached public-safe listing projection  |
| legal/how-it-works | static/cached                          |
| `/go/[slug]`       | dynamic Node Route Handler, no cache   |

### Private routes

Owner/admin pages are dynamic and no-store. Never tag them with public cache tags. Use validated Supabase session/claims on every request.

### Dynamic payment routes

Checkout creation, status, webhook and upload routes are dynamic/no-store. Webhook reads raw request body before parsing and uses Node runtime.

---

## 8. Cache design

Public data is a derived projection. Suggested tags:

```text
board:main
board:today:YYYY-MM-DD
board:category:<categorySlug>
listing:<listingId>
listing-slug:<listingSlug>
activity:public
```

After a committed rank-affecting delta:

- invalidate `board:main`;
- invalidate current `board:today:<businessDate>`;
- invalidate listing category tag;
- invalidate listing detail tag;
- invalidate public activity tag.

After category change invalidate old and new category tags. After moderation/lifecycle eligibility change invalidate all affected tags.

### Cache rules

- Never cache owner/admin/provider/ledger/report payloads in a shared/public cache.
- Never include email/session-dependent content inside a public `use cache` function.
- Build public projection objects with a strict allowlist.
- Use short practical cache life plus on-demand invalidation; exact duration is operational (initially tens of seconds to a few minutes).
- If invalidation fails after commit, record telemetry and rely on TTL/manual refresh; financial state remains correct.
- The payment confirmed page reads authoritative no-store state, not board cache.

### Why no realtime

The product does not require millisecond collaborative updates. Cache invalidation plus refresh provides a lively board with much lower cost/complexity than WebSockets/Supabase Realtime. Add realtime only if measured product behaviour proves it necessary.

---

## 9. Database connections

Use two URLs:

```text
DATABASE_URL              # Supavisor transaction pooler for runtime
DATABASE_DIRECT_URL       # direct database host for migrations/admin scripts
```

Runtime driver:

```ts
postgres(process.env.DATABASE_URL, {
  prepare: false,
  max: boundedSmallPool,
  connect_timeout: bounded,
  idle_timeout: bounded,
});
```

Rationale:

- serverless instances can scale horizontally;
- transaction pooler protects PostgreSQL connection budget;
- prepared statements are incompatible/problematic under transaction pooling;
- migrations need a direct/session connection.

Do not open a database connection at client import. Use server-only module and a process-global singleton in development to avoid hot-reload leaks.

Set statement/lock timeouts for financial transactions; keep them short and deterministic. Never call external services while holding locks.

---

## 10. PostgreSQL schema exposure

Keep domain tables in non-exposed schemas such as `app` and `private`, not the default public Data API surface. Use the server database role through Vercel.

- `app`: public-domain entities/projections still accessed only server-side.
- `private`: payment, owner, reports, audit, email, security/reconciliation.
- `public`: no application table by default; only carefully reviewed compatibility objects if ever needed.

Revoke broad grants. Enable RLS as defence in depth where relevant, but do not pretend `TO authenticated` alone is ownership authorisation.

Supabase Auth tables remain managed. Views must use `security_invoker` where exposed; avoid `SECURITY DEFINER`, and if genuinely required place it in a private schema, fix `search_path`, revoke `PUBLIC EXECUTE`, explicitly check identity and test it.

---

## 11. Authentication architecture

### Public/guest

No session required to view boards or begin first sponsor flow. A pending owner record captures canonical email privately.

### Owner

Supabase passwordless email magic link with PKCE/SSR cookies. Implement current `@supabase/ssr` pattern using `proxy.ts`, `createServerClient`, cookie `getAll/setAll` and server-side claim/user validation.

- use custom SMTP (Resend) for production;
- allowlisted production/preview/local redirect URLs;
- relative `next` paths only;
- generic magic-link request responses;
- rate limit and optionally Turnstile;
- claim only when authenticated email matches pending owner record.

Do not use editable `user_metadata` for authorisation. Owner relationship comes from `private.listing_owners` keyed by Supabase user UUID.

### Admin

Admin requires normal Supabase Auth session plus a server-queried `private.admin_users` active row and role. Recommended launch controls:

- separate admin allowlist;
- mandatory MFA once available/configured;
- short session/re-auth for destructive actions;
- no public “become admin” flow;
- every admin mutation audited.

Do not rely solely on email domain or client-side route guards.

---

## 12. Payment provider adapter

Define an internal interface rather than spreading Cashfree payloads through domain code.

```ts
interface PaymentProvider {
  createOrder(
    input: CreateProviderOrderInput,
  ): Promise<CreateProviderOrderResult>;
  fetchOrder(input: FetchProviderOrderInput): Promise<NormalizedProviderOrder>;
  fetchPayment(
    input: FetchProviderPaymentInput,
  ): Promise<NormalizedProviderPayment>;
  verifyAndParseWebhook(
    input: RawWebhookInput,
  ): Promise<NormalizedWebhookEvent>;
  createRefund?(input: CreateRefundInput): Promise<NormalizedRefund>;
}
```

Normalized event types:

```text
PAYMENT_SUCCEEDED
PAYMENT_PENDING
PAYMENT_FAILED
PAYMENT_DROPPED
PAYMENT_EXPIRED
REFUND_EFFECTIVE
REFUND_REVERSED
CHARGEBACK_EFFECTIVE
CHARGEBACK_REVERSED
UNKNOWN_AUTHENTIC_EVENT
```

Adapter responsibilities:

- provider authentication/signature details;
- raw payload parsing;
- provider status vocabulary;
- timestamp conversion;
- idempotency headers;
- hosted checkout session/order creation;
- error classification and safe logging;
- exact provider ID extraction.

Domain service responsibilities:

- mapping event to internal attempt/listing;
- policy validation;
- ledger fulfilment/adjustment;
- rank/daily projections;
- lifecycle changes;
- cache/email side effects after commit.

Never make provider approval assumptions in code/copy. Feature flag live checkout until merchant approval is complete.

---

## 13. Checkout creation architecture

A single long transaction that calls the provider is prohibited.

### Phase A — internal intent transaction

1. Validate input, Turnstile, URL, category, amount and ownership.
2. Recalculate minimum/quote server-side.
3. Resolve/create provisional listing as permitted.
4. Insert payment attempt with immutable amount/purpose/policy/target snapshots and application idempotency key.
5. Commit.

### Phase B — provider call

1. Call provider outside DB transaction.
2. Use deterministic provider order ID/idempotency key derived from internal attempt.
3. Set amount/currency/return/webhook metadata from trusted server values.
4. Supply the provider's currently required customer-contact fields from validated private input. Cashfree's current order contract requires a customer phone; use a real E.164 payment-contact number, never a fabricated placeholder. The phone is not an ownership credential and is never public.

### Phase C — persist checkout session

1. Lock/fetch attempt.
2. Store provider order ID/session details/expiry.
3. Return only public checkout data.

If provider call result is unknown due timeout, retrieve order by deterministic ID before creating anything else. Retry does not make a second internal intent.

---

## 14. Webhook architecture

Route: `POST /api/payments/cashfree/webhook`

1. Capture raw body bytes/text exactly once.
2. Verify signature/timestamp using provider's current official algorithm and secret.
3. Reject invalid signature without business processing.
4. Parse/validate schema; normalise event.
5. Execute idempotent financial transaction from `03`.
6. Return quickly.
7. Trigger cache invalidation/email from durable outbox/after-commit work.

HTTP semantics:

- invalid signature/malformed unauthenticated request: 400/401 as provider guidance permits;
- authentic duplicate/already processed: 200;
- authentic but unknown/mismatched event durably quarantined: 200 after recording, with alert;
- transient database failure before durable result: 5xx so provider retries;
- never return success before database handling has durably completed or quarantined.

Do not log raw webhook body in ordinary logs. Store encrypted/restricted raw payload only where required for reconciliation, with retention controls.

---

## 15. Status polling

Public browser uses a random `attempt_public_id` plus a possession-bound mechanism where necessary; it never queries by sequential database ID/provider ID.

Status endpoint:

- no-store;
- rate-limited;
- returns a minimal enum and public result;
- never exposes email/provider payload/admin notes;
- on pending may optionally enqueue/perform a bounded provider status check according to provider rate limits;
- never trusts client status.

For owner raises, session ownership is also required. For guest first checkout, the public attempt token is high entropy and returns only safe listing/amount/result data.

---

## 16. Email architecture

Use a small durable email outbox in PostgreSQL.

Events:

- payment confirmed;
- claim/manage magic link prompt;
- payment verification delay/manual support;
- effective refund/chargeback/total change;
- moderation/change-request result;
- admin operational alert (separate channel if configured).

Financial transaction inserts outbox row atomically. After commit, a Vercel function/cron drains rows with idempotent provider message keys, bounded retries and status tracking.

For Supabase Auth email, configure Resend as custom SMTP; Auth owns magic-link token generation. Domain transactional emails use Resend API/templates.

No payment fulfilment waits on email delivery.

---

## 17. Logo upload architecture

1. Authenticated owner/new sponsor requests upload intent with declared type/size.
2. Server verifies authorisation/rate/limits and issues short-lived signed upload to private staging bucket/prefix.
3. Browser uploads directly to Supabase Storage.
4. Server finalise route downloads from trusted bucket/key, checks actual bytes, decodes/re-encodes with Sharp and writes sanitized derivative to public-safe bucket/path.
5. Database asset state changes from `staged` to `ready`.
6. Orphan cleanup removes expired/rejected objects.

New guest listing upload intent is bound to a short-lived server-created draft token/payment attempt, not arbitrary public writes.

Never serve staging object publicly. Use random keys; do not include email/name in object path.

---

## 18. URL and redirect architecture

`/go/[listingSlug]`:

1. rate/bot-aware request classification;
2. server lookup by slug;
3. require public eligibility;
4. parse stored approved URL and repeat safety check;
5. increment privacy-safe click aggregate/dedupe asynchronously or bounded best effort;
6. return `302`/`307` with `Location` from stored value.

Do not accept destination URL query params. Use response headers preventing unsafe caching/referrer leakage as appropriate. No server-side destination crawl/preview in V1, eliminating a broad SSRF class.

---

## 19. Domain/application services

Recommended service boundaries:

```text
ListingService
  createDraft, validateDestination, editSafeFields, requestSensitiveChange

PricingService
  initialMinimum, minimumRaise, takeoverQuote, estimateRank

LeaderboardQueryService
  main, today, category, listingPublicDetail

PaymentIntentService
  createInitialAttempt, createRaiseAttempt, createProviderCheckout

PaymentFulfillmentService
  applySucceededPayment, applyAdjustment, quarantineMismatch

OwnershipService
  requestMagicLink, claimPendingListing, requireOwner

ModerationService
  screenSubmission, report, suspend, clear, remove, approveChange
  # deterministic V1 rules/denylists/risk signals; low-risk auto-clear, ambiguous pending_review

AssetService
  createUploadIntent, sanitize, publish, cleanup

ClickService
  safeRedirect, dedupeAndAggregate

ReconciliationService
  compareProviderAndLedger, repairProjection, createIncident
```

Domain modules contain pure calculations and state transition validation. Server modules handle I/O. React components do not contain payment/ranking policy.

---

## 20. API conventions

- Internal IDs: UUIDv7/UUID where supported; never sequential public IDs.
- Public IDs/slugs: high entropy or stable non-secret slug, depending on resource.
- JSON money: strings.
- Dates: ISO 8601 UTC; business date explicit `YYYY-MM-DD`.
- Errors: stable application code + safe message + request ID; no stack/provider detail.
- Mutations: idempotency key where retry may create money/order/upload/report side effects.
- Validation: Zod at request/provider/environment boundary, database constraints underneath.
- Content type and body size limits explicit.
- Same-origin/session mutations use CSRF-aware Server Action/route patterns; JSON routes validate origin/content type where appropriate.
- Security headers from Next/Vercel config.

Example error:

```json
{
  "error": {
    "code": "AMOUNT_BELOW_MINIMUM_RAISE",
    "message": "The minimum raise for this listing is ₹1,001.",
    "requestId": "req_..."
  }
}
```

---

## 21. Environment separation

At minimum:

| Environment     | Vercel                     | Supabase                   | Cashfree | Resend              | Domain                    |
| --------------- | -------------------------- | -------------------------- | -------- | ------------------- | ------------------------- |
| local           | local dev                  | local/separate dev project | sandbox  | test/safe recipient | localhost                 |
| preview/staging | preview project/deployment | dedicated staging project  | sandbox  | test domain         | protected preview/staging |
| production      | production project         | production Pro project     | live     | production domain   | goneviral.in              |

Never connect preview deploys to production database/payment credentials. Vercel preview URLs must not be accepted as live provider return/webhook URLs unless intentionally staging.

Use provider environment as part of every uniqueness key to prevent sandbox/live collision.

---

## 22. Configuration and secrets

Validate environment at boot/build with a server-only schema. Example classes:

### Public

```text
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_TURNSTILE_SITE_KEY
NEXT_PUBLIC_SENTRY_DSN (if intentionally public)
```

### Server secret

```text
DATABASE_URL
DATABASE_DIRECT_URL
SUPABASE_SECRET_KEY / service-role equivalent
CASHFREE_CLIENT_ID
CASHFREE_CLIENT_SECRET
CASHFREE_WEBHOOK_SECRET/config
RESEND_API_KEY
TURNSTILE_SECRET_KEY
CLICK_HMAC_SECRET_CURRENT
CLICK_HMAC_SECRET_PREVIOUS
SENTRY_AUTH_TOKEN (build/deploy only)
CRON_SECRET
```

Rules:

- no server secret uses `NEXT_PUBLIC_`;
- no secrets in repository, logs, screenshots or support output;
- `.env.example` contains names/descriptions, not values;
- rotate secrets via documented runbook;
- provider/webhook rotation supports overlap when provider permits;
- fail closed in production when required secret/config is missing.

---

## 23. Feature/operational flags

Server-controlled flags:

```text
payments_enabled
new_listings_enabled
raises_enabled
outbound_redirects_enabled
uploads_enabled
admin_refunds_enabled
maintenance_banner
read_only_mode
provider_reconciliation_enabled
```

Flags are audited/configured outside client bundle and cannot alter historical policy. `read_only_mode` keeps public boards readable while blocking new money-changing actions during incidents.

---

## 24. Scalability plan

### Launch

- indexed PostgreSQL queries;
- cached top board pages;
- small stateless functions;
- direct precomputed `listing_daily_totals`;
- no realtime/queue infrastructure;
- bounded connection pooling.

### First pressure points and responses

1. **Public read traffic:** increase cache lifetime/CDN hit rate; precompute public projection; paginate beyond top N.
2. **Write/payment bursts:** verify indexes/lock duration; tune Supabase compute/connection pool; queue non-financial side effects through outbox.
3. **Large ledger:** partition only after measured need; indexes by listing/applied time/provider refs first.
4. **Today aggregation:** daily projection already avoids scanning full ledger.
5. **Click volume:** aggregate/dedupe tables with expiry; move best-effort ingestion only if measured.
6. **Image traffic:** sanitized small variants through CDN/storage.

Do not add Redis merely to cache a query Vercel/Supabase/Postgres already handle. Do not add a microservice until a clear ownership/scaling boundary exists.

---

## 25. Availability and failure model

### Supabase unavailable

- cached public board may continue temporarily;
- dynamic checkout/manage/admin fail closed with friendly status;
- provider webhook returns 5xx if no durable recording is possible so retries occur;
- operational alert fires;
- no client-side fallback writes.

### Payment provider unavailable

- boards remain readable;
- checkout creation is disabled/degraded;
- existing pending attempts continue reconciliation later;
- do not mark failed solely on local timeout.

### Email unavailable

- financial confirmation still commits;
- outbox retries;
- pending page can show result;
- owner may request magic link later.

### Cache invalidation unavailable

- state remains correct in DB;
- log/alert and rely on TTL/manual refresh;
- confirmed page shows DB result.

### Storage unavailable

- logo is optional; listing/payment can proceed without it;
- preserve draft/upload status.

---

## 26. Observability architecture

Correlate across application/provider/database using:

```text
request_id
attempt_public_id / internal attempt_id
provider_order_id
provider_event_id
provider_payment_id
listing_id
ledger_entry_id
reconciliation_run_id
```

Do not put email, full destination query, raw body or secrets in tags.

Telemetry:

- structured JSON server logs;
- Sentry errors/traces with PII scrubbing;
- Vercel function/cache metrics;
- Supabase DB/connection/advisor metrics;
- provider dashboard/webhook delivery;
- internal admin operational dashboard;
- periodic reconciliation results.

Financial correctness alerts are more important than pageview alerts.

---

## 27. Dependency policy

- Add only dependencies with a concrete requirement.
- Prefer platform/framework/native APIs.
- Pin exact versions; commit lockfile.
- Review maintenance/reputation/license/bundle impact.
- No dependency for simple money formatting/calculation.
- Keep provider SDK optional: direct official REST client may be safer/lighter if SDK quality/version does not fit serverless.
- Run security audit and review high/critical issues; do not blindly auto-fix major versions.
- Generate SBOM/dependency list in CI/release if practical.

---

## 28. Explicit rejected alternatives

### Separate Go/Node API

Rejected for V1 because Next.js server runtime already handles the bounded API/payment workload. A second deploy adds auth, networking, observability and schema coordination without current benefit.

### Prisma

Not inherently bad, but Drizzle is lighter and closer to the explicit SQL/locking required. Do not switch without measured reason.

### Direct Supabase browser CRUD

Rejected because money, ownership, moderation and payment events need one trusted application boundary and private schemas.

### Supabase Realtime/WebSockets

Rejected because invalidation/refresh meets product need more cheaply.

### VPS/self-hosted database

Rejected by product constraint and operational burden.

### Vercel Hobby/Supabase Free production

Rejected for a live commercial money product. Use for development/private testing only.

### User-provided remote image hotlinking

Rejected due privacy, tracking, broken content and unsafe-format concerns. Upload and sanitize.

### Server-side destination previews

Rejected in V1 due SSRF/abuse complexity; display submitted text/approved logo instead.

---

## 29. Architecture acceptance criteria

- [ ] One Next.js repository/deploy implements public, owner, admin, webhook and scheduled work.
- [ ] Exact current versions are pinned after official/Context7 verification.
- [ ] Runtime DB uses Supavisor transaction pooler; migrations use direct URL.
- [ ] Money uses `bigint` end-to-end.
- [ ] Domain tables are not exposed to direct public Data API CRUD.
- [ ] Public caches use strict public projections and tags.
- [ ] Private routes/data are dynamic/no-store.
- [ ] Cashfree is isolated behind an interface and live checkout feature flag.
- [ ] Browser return cannot fulfil payment.
- [ ] External calls occur outside row-locking transactions.
- [ ] Email is outbox-driven and non-blocking.
- [ ] Auth uses current Supabase SSR/PKCE pattern and DB owner relationships.
- [ ] Upload uses private staging plus server sanitisation.
- [ ] Redirect is slug-based and cannot become an open redirect.
- [ ] Preview/staging cannot use production credentials.
- [ ] No unnecessary Redis/realtime/microservice/VPS dependency exists.
