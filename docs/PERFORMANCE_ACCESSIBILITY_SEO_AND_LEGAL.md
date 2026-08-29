# Performance, accessibility, SEO, and legal launch surface

This document records the Phase 14 launch-quality design and the limits of the
local evidence. It does not claim production traffic, hosted-infrastructure
performance, legal approval, or human assistive-technology certification.

## Public read path and cache boundary

Main, Today, category, public listing, activity, and sitemap listing reads use
strict public database projections. Main and Today rank and page the eligible
listing IDs before fetching logo and click aggregates for the selected page.
The projections exclude owner, pending-owner, payment-attempt, provider-event,
email, report, admin, and other private fields.

Dynamic public reads use the Next.js remote cache handler with a 30-second
revalidation window and five-minute expiry. Categories use a longer local
configuration cache. Sitemap entries use an allowlisted projection and a
five-minute revalidation window. Private owner/admin/payment pages remain
request-bound and are never placed in the public cache.

Authoritative payment, owner-edit, and admin changes carry a cache-impact value
containing the public listing ID, public slug, IST business date, and old/new
category slugs. Invalidation expires only the affected Main, Today, listing,
activity, and category tags. The public refresh control uses a same-host POST
and 303 redirect, so it works before hydration; it exposes no private input or
output. Direct database fixture changes deliberately bypass invalidation, and
tests explicitly exercise the refresh route after fixture resets.

## Database and performance evidence

Migration `20260829120000_phase_14_launch_quality_indexes.sql` adds measured
partial indexes for public ranking, category ranking, admin moderation queues,
provider-event retention/quarantine, email workers/exceptions, and open
reconciliation items. Drizzle declarations mirror the migration.

Run:

```text
pnpm perf:query-plans
pnpm test:performance
```

The query-plan script is hard-blocked from production and non-loopback targets.
It creates temporary, clearly synthetic tables, copies the production query and
index shapes, runs `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`, warms once, and
records 25 complete SQL executions for each query family. Its default dataset
contains 20,000 listings, 100,000 daily rows, 200,000 ledger rows, 100,000
provider events, 60,000 payment attempts, 40,000 outbox rows, 20,000 owners,
and 20,000 reconciliation rows. Main, Today, category, owner, admin, payment,
webhook, email-outbox, reconciliation, and listing-ledger evidence is stored in
`artifacts/phase14-performance/query-plans.json`.

The load test creates 24 separate local mock-provider checkout attempts and
fulfils them in batches of six, followed by 24 concurrent deliveries of one
duplicate payment event. It measures the database fulfilment path only,
excluding provider network and signature parsing, verifies exact attempt and
ledger counts, and fails on pool errors. Its evidence is stored in
`artifacts/phase14-performance/payment-webhook-load.json`.

These are local lab measurements. They are not mobile p75 field data, hosted
Supabase results, Vercel cache-hit results, or genuine Dodo certification.

## Rendering and bundle policy

Public pages remain Server Components except for controls that require browser
state. Loading uses a stable server-rendered board skeleton. Board cards reserve
layout space and defer off-screen rendering with `content-visibility`. Logo
images declare fixed dimensions and responsive `sizes`; the listing hero uses
the current Next.js `preload` API. The image pipeline permits AVIF/WebP variants
and a bounded size/quality set.

Use the Next.js 16 Turbopack analyzer after a production build:

```text
pnpm exec next experimental-analyze --output
```

The generated analyzer is intentionally left under ignored `.next/diagnostics`
rather than committed as product source.

## Accessibility and browser policy

The interface targets WCAG 2.2 AA with semantic landmarks, headings, lists,
native financial-history tables, field labels and error relationships, live
status messages, descriptive logo/INR names, visible focus, reduced motion,
non-colour-only copy, 200% zoom support, and cross-engine touch targets with a
46px CSS minimum to remain at least 44px after engine rounding.

The Playwright production matrix covers Chromium at 1440px, 390px, 320px, and a
larger Android viewport; WebKit at tablet and 1440px; and Firefox at 1440px.
Axe runs on the major public, report, pending, owner, and authenticated flows.
Chromium and Firefox exercise sequential keyboard focus. Playwright WebKit
mirrors Safari's host-level “press Tab to highlight each item” preference, which
automation cannot enable, so WebKit verifies focus rendering directly; manual
Safari preference and screen-reader smoke remain human gates.

Production CSP keeps `upgrade-insecure-requests`. Only an explicit HTTP
loopback `NEXT_PUBLIC_SITE_URL` omits that directive so WebKit can load a local
production-build lab; unsafe eval remains forbidden.

## SEO and legal boundary

Public Main, Today, category, listing, and how-it-works pages have canonical,
Open Graph, and Twitter metadata based only on confirmed public facts. Robots
and sitemap output exclude actions, admin, API, auth, outbound redirects,
checkout/join, pending/return, owner/manage, report, webhook, cron, and health
surfaces. The sitemap includes only active, clear, positive, HTTPS listings in
active categories.

Terms, Privacy, Refunds, Content Policy, Paid Placement, Copyright/Trademark,
and Contact are effective owner-approved public policies at version
`2026-08-29-v1`, effective 29 August 2026. They are canonical, indexable, and
included in the public sitemap. Checkout acceptance records the matching Terms,
Privacy, Refund, and Content versions. The footer, report, checkout, and owner
surfaces link to these policies. Owner approval is not represented as counsel,
tax, accounting, provider, or CA approval; those distinct launch gates remain
open until genuine evidence exists.

## Gates that remain open

- real mobile field LCP, INP, and CLS from genuine traffic;
- hosted Supabase plans, pool behaviour, and lock observations;
- Vercel CDN/shared-cache hit measurements;
- genuine Dodo test/live credentials and provider certification;
- hosted Sentry, alert delivery, Storage, and restore evidence;
- external penetration testing;
- CA/accounting validation of tax, invoicing, and financial operations; optional
  independent legal review does not suspend the effective owner-approved policies;
- manual NVDA/VoiceOver/TalkBack and real-device/staging certification.
