# GoneViral.in — README for Codex

**Specification version:** `2026-08-29-v2`
**Business time zone:** `Asia/Kolkata`  
**Implementation status:** blueprint only; do not assume application code exists

## What you are building

GoneViral.in is a paid public sponsored leaderboard for the Indian internet.

> **PAY MORE. RANK HIGHER.**

People, creators, startups, products and legitimate organisations purchase sponsored placement. Public ordering is determined only by cumulative server-confirmed sponsorship amounts, net of applied reversals. There are no votes, prizes, participant payouts or ranking algorithm.

Every public board must visibly disclose in plain language:

> **Paid list. Money decides the order.**

## Read in this order

1. [`00_DECISIONS_AND_PRODUCT_RULES.md`](./00_DECISIONS_AND_PRODUCT_RULES.md) — canonical product law.
2. [`01_PRODUCT_UX_AND_DESIGN.md`](./01_PRODUCT_UX_AND_DESIGN.md) — journeys, screens, copy and design system.
3. [`02_TECHNICAL_ARCHITECTURE.md`](./02_TECHNICAL_ARCHITECTURE.md) — stack and system boundaries.
4. [`03_DATABASE_PAYMENTS_AND_SECURITY.md`](./03_DATABASE_PAYMENTS_AND_SECURITY.md) — schema, ledger, payment state machines, locks and threat model.
5. [`04_CODEX_IMPLEMENTATION_PLAN.md`](./04_CODEX_IMPLEMENTATION_PLAN.md) — sequential build phases.
6. [`05_TESTING_DEPLOYMENT_AND_OPERATIONS.md`](./05_TESTING_DEPLOYMENT_AND_OPERATIONS.md) — tests, CI, deployment and runbooks.

## Conflict resolution

When statements conflict, use this priority:

1. Explicit formulas and invariants in `00`.
2. Transactional/database rules in `03`.
3. Phase acceptance criteria in `04`.
4. UX presentation in `01`.
5. Architecture guidance in `02` and operations guidance in `05`.

Do not silently choose an interpretation. Record the conflict and amend the authoritative document before implementing different behaviour.

The following older GoneViral model is rejected everywhere:

> A fresh bid replaces the previous bid, or only the latest bid matters.

V1 uses an immutable cumulative financial ledger.

## Locked decisions at a glance

| Decision                     | V1 rule                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| First sponsorship minimum    | **₹499** (`49_900` paise)                                                             |
| Later minimum raise          | `MAX(10% of ORIGINAL successful sponsorship rounded up to a whole rupee, ₹1,000)`     |
| Ranking                      | Confirmed cumulative total, net of applied reversals                                  |
| Tie                          | Earlier attainment of the equal current total wins; challenger must exceed by ₹1      |
| Today                        | Net confirmed sponsorship applied during the current IST calendar day                 |
| Categories                   | Filtered views of the same listing/ledger system                                      |
| Money                        | PostgreSQL `bigint` paise; TypeScript `bigint`; whole-rupee V1 inputs                 |
| First checkout               | No mandatory account; claim/manage by email magic link afterward                      |
| Payment authority            | Verified server-side provider state only; browser redirects never change rank         |
| Public refresh               | Cached reads plus tag invalidation; no WebSockets                                     |
| Infrastructure               | Production host deferred + Supabase Free; Cloudflare Workers Cron scheduler           |
| Current payment provider      | Dodo Payments hosted checkout, only after written approval of this exact advertising model |

## Selected stack

- Node.js 24 LTS.
- Current patched Next.js 16 App Router release, React 19.2-compatible release, strict TypeScript and pnpm.
- Production host and plan selected separately immediately before commercial
  launch; retain Mumbai proximity for database-connected work when supported.
- Supabase Free Mumbai/South Asia (`ap-south-1`) for PostgreSQL, Auth and
  Storage, with the owner-accepted recovery posture in
  `../docs/PHASE_15_BUDGET_CONSTRAINED_LAUNCH_PLAN.md`.
- Public-repository GitHub Actions for initial five-minute/hourly/daily
  scheduling after its visibility and secret-safety gates pass.
- Drizzle ORM/Kit for typed schema, migrations and ordinary queries.
- Explicit parameterised PostgreSQL inside Drizzle transactions for payment, ledger and row-locking paths.
- `postgres.js` through Supavisor transaction pooling with prepared statements disabled; direct connection for migrations.
- Zod, Tailwind CSS 4 with bespoke components, Geist Sans/Mono.
- Dodo Payments behind a narrow provider adapter; Resend; Cloudflare Turnstile; Sentry; Vercel Web Analytics.
- Vitest, Playwright and axe-based accessibility checks.

Do not add Redis, WebSockets, queues, GraphQL, microservices, a VPS, Supabase Realtime or a second backend unless a later measured bottleneck and approved specification change justify it.

## Codex working rules

- Build one phase at a time.
- Do not begin the next phase until the current phase's tests and acceptance criteria pass.
- Pin dependencies and commit the lockfile.
- Verify exact current APIs and patches against official documentation and Context7 at Phase 0.
- Use PostgreSQL as GoneViral's domain authority and the payment provider as external settlement authority.
- Never use JavaScript `number` or SQL floating point for domain money.
- Never put owner-private, provider, financial or admin data in public caches/client bundles.
- Never create production fake listings, payments, clicks, testimonials or activity.
- Never call a browser return/callback “confirmed” until the ledger transaction commits.
- Do not add product behaviour to unblock coding. Amend the specification first.

## Research and decision summary

### Product patterns

Outbid-style products demonstrate that the homepage should be the product: visible rank, amount, identity, an exact current takeover price and recent movement. The emotional loop is not feature volume; it is seeing a public position, knowing the price to move it and sharing the result.

GoneViral borrows:

- immediate board visibility;
- exact “₹X currently passes #N” information;
- public prices and rank movement;
- a second activity surface (`Today`) so expensive lifetime positions do not freeze the spectacle;
- shareable, truthful victory moments.

GoneViral deliberately avoids:

- cloning another brand/layout;
- countdown-auction pressure, anti-sniping and “winner” language;
- backlink/SEO guarantees;
- casino/crypto visuals;
- fake live traffic or fake entrants;
- dozens of categories and mechanics at launch.

The Million Dollar Homepage remains useful as a lesson in radical legibility and cultural talkability; its link rot is a reminder that paid visibility still needs destination safety, moderation and honest permanence language.

### Initial minimum

₹499 is retained because it is accessible enough for creators and small startups, familiar in Indian digital purchasing, high enough to create basic spam/quality friction, and viable under ordinary percentage gateway fees. Provider promotional fees are never part of the product economics.

### Today rule

Today ranks active listings by **net rank-affecting sponsorship applied since midnight IST**. First payments and raises add; refunds/chargebacks applied today subtract. It resets by calendar day without mutating lifetime totals. This is understandable, auditable, hard to game by splitting payments and consistent with “pay more, rank higher.”

### Payment provider

Dodo Payments is the selected V1 engineering provider and is isolated behind a narrow hosted-checkout adapter so another provider can be added or substituted later without changing ledger or ranking semantics. Phase 4 uses Dodo test mode or the deterministic local mock only. The Dodo product must be a one-time INR product with `pay_what_you_want` enabled; the customer-entered `amount` is sent in paise. The founder must still obtain written approval describing GoneViral truthfully as paid digital advertising placement with no prize, wager, participant payout, or transferable balance.

Dodo's current public checkout-session API creates a provider-generated session ID and does not document an idempotency key or lookup by merchant request ID for a response-less create timeout. Therefore the real adapter performs no automatic create retry: an ambiguous POST remains safely pending for operator/provider reconciliation. Deterministic timeout recovery is exercised only by the mock until Dodo documents or confirms a safe recovery contract. Browser returns never confirm payment.

Phase 5 uses Dodo's Standard Webhooks-compatible delivery contract at the provider-specific server route. Signature verification is performed by the pinned official Dodo TypeScript SDK against the exact raw request body and the `webhook-id`, `webhook-signature`, and `webhook-timestamp` headers before JSON fields receive any authority. Only `payment.succeeded` paired with a `succeeded` payment status can fulfil an attempt; business, environment, checkout session, attempt metadata, payment identity, amount, and INR currency must all match. Authentic unknown or mismatched events are durably quarantined and acknowledged without changing rank. Provider retries and different event IDs for the same payment remain idempotent through provider-event, provider-payment, and positive-ledger uniqueness. A deterministic local signed vector is not evidence of a genuine Dodo sandbox delivery; that contract check remains gated on test credentials and a Dodo-created webhook secret.

### Production cost reality

Vercel Hobby is suitable only for development/private testing under its current
non-commercial terms. Commercial launch uses Vercel Pro with the strict cost
controls in `../docs/PHASE_15_BUDGET_CONSTRAINED_LAUNCH_PLAN.md`. The owner has
accepted Supabase Free initially, including no managed PITR, possible inactivity
pause, self-managed backup dependence, and recovery downtime. Upgrade Supabase
after measured traffic, reliability need, or revenue justifies it.

### Legal/product language

Customer-facing copy uses **add your work**, **pay**, **move up**, **paid list**,
**current total**, and **confirmed**. Public UI must not use **sponsor**,
**sponsorship**, or **sponsored rank**; those remain internal business, provider,
database, and legal terms. Avoid defining the transaction as an auction, game,
bet, prize or investment. Every board and checkout discloses paid ordering and
no guarantee of impressions, clicks, sales or virality. Indian counsel and a
chartered accountant are launch gates for Terms, DPDP/privacy,
content/grievance duties, refunds, GST invoices and place-of-supply.

## Commercial launch gates

Codex may build through sandbox phases, but production payments remain disabled until:

- [ ] lawful merchant entity and bank account are ready;
- [ ] Dodo Payments or an approved replacement provider has approved the exact model in writing;
- [ ] KYC and live credentials are approved;
- [ ] Indian counsel has reviewed Terms, Privacy, sponsored-ranking disclosure, content and refund policy;
- [ ] CA has approved GST/invoicing/accounting treatment;
- [ ] `goneviral.in` and authenticated email sending are configured;
- [ ] the separately selected commercial production host/plan and its cost
      controls are active in the selected region;
- [ ] Supabase Free capacity, encrypted backup freshness, and owner-accepted
      recovery posture are verified;
- [ ] the Cloudflare Workers Cron scheduler safety and cadence gates pass;
- [ ] production webhooks, reconciliation, alerts, backup and restore tests pass.

## Research source register

Re-check all version/provider/legal sources immediately before implementation and launch.

- Outbid: <https://outbid.lol/>
- Million Dollar Homepage retrospective: <https://www.wired.com/2006/01/million-dollar-homepage-hits-the-mark/>
- Next.js documentation/blog: <https://nextjs.org/docs/app>, <https://nextjs.org/blog>
- Node release schedule: <https://nodejs.org/en/about/previous-releases>
- Vercel plans/regions: <https://vercel.com/pricing>, <https://vercel.com/docs/plans/hobby>, <https://vercel.com/docs/regions>
- Supabase pricing/regions/connections/auth/RLS/storage: <https://supabase.com/pricing>, <https://supabase.com/docs/guides/platform/regions>, <https://supabase.com/docs/guides/database/connecting-to-postgres>, <https://supabase.com/docs/guides/auth/server-side/nextjs>, <https://supabase.com/docs/guides/database/postgres/row-level-security>, <https://supabase.com/docs/guides/storage/security/access-control>
- Drizzle: <https://orm.drizzle.team/docs/get-started-postgresql>, <https://orm.drizzle.team/docs/transactions>, <https://orm.drizzle.team/docs/sql>, <https://orm.drizzle.team/docs/migrations>
- PostgreSQL locks/isolation: <https://www.postgresql.org/docs/current/explicit-locking.html>, <https://www.postgresql.org/docs/current/transaction-iso.html>
- Dodo Payments checkout/API: <https://docs.dodopayments.com/developer-resources/integration-guide>, <https://docs.dodopayments.com/api-reference/checkout-sessions/create>, <https://docs.dodopayments.com/api-reference/checkout-sessions/retrieve>, <https://dodopayments.com/pricing>
- Razorpay terms: <https://razorpay.com/terms/>
- Resend, Turnstile, Sentry: <https://resend.com/pricing/>, <https://developers.cloudflare.com/turnstile/plans/>, <https://developers.cloudflare.com/turnstile/get-started/server-side-validation/>, <https://sentry.io/pricing/>
- ASCI: <https://www.ascionline.in/the-asci-code/>, <https://www.ascionline.in/social/faqs/>
- Indian privacy/platform materials: <https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa>, <https://www.meity.gov.in/documents/act-and-policies/promotion-andregulation-of-online-gaming-act-2025-and-its-corrigenda-kTMxQjMtQWa>, <https://consumeraffairs.nic.in/acts-and-rules/consumer-protection>

## Consistency Audit Result

The completed specification set was checked for cross-file agreement. The following ambiguities were resolved before delivery:

1. **Today** is IST calendar-day net sponsorship activity, not rolling 24 hours, creation date or clicks.
2. **10% rounding** is upward to the next whole rupee before the ₹1,000 floor.
3. **Tie time** is the database time the latest rank-affecting delta is applied; reversals give the lower total a new reached time.
4. **Lifecycle and moderation** are separate axes, preventing suspension from rewriting money.
5. **Production infrastructure risk** is explicit: the production host/plan is
   selected separately immediately before commercial launch; Supabase Free is
   owner-accepted with self-managed recovery; Cloudflare Workers Cron is the
   private-staging scheduler after GitHub scheduled events were retired.
6. **Provider approval** is explicit; Dodo Payments is the selected adapter implementation, not guaranteed merchant acceptance, and can be replaced behind the interface.
7. No obsolete fresh-bid/replacement model, client-confirmed ranking, writable rank or non-cumulative interpretation remains.
