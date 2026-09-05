# Phase 15 production launch checklist

Last reviewed: 2026-09-04 (Asia/Kolkata)

## Current decision

GoneViral's production topology is Vercel for the Next.js application, the
existing Supabase Free project `fndssapjkaicxzeruuvv` in `ap-south-1` for
Database/Auth/Storage, and Cloudflare Workers Cron for the five authenticated
scheduled operations. Preview and Production intentionally share this Supabase
project during non-commercial Dodo Test Mode pre-launch testing. Dodo Payments
is the merchant of record, Resend handles application and Supabase Auth email,
and Sentry handles application errors.

Vercel Pro is required for commercial Production. Vercel's current Hobby terms
limit it to personal, non-commercial use, and its fair-use guidance expressly
classifies requesting/processing payment and advertising a service as
commercial. Cloudflare scheduling removes the Vercel Cron feature dependency;
it does not remove the Vercel commercial-plan requirement. Pro is currently
advertised at US$20/month with US$20 included usage credit, but usage, seats,
tax, card conversion, integrations, and add-ons can change the final bill. The
owner has authorized production-shaped pre-launch deployment on Hobby.
Vercel Pro purchase remains a final pre-commercial-launch gate.

The public policies are owner-drafted, not lawyer-approved. The owner chooses to
launch without an external lawyer or chartered-accountant sign-off and accepts
that professional review would reduce, not eliminate, legal and tax risk. The
official materials reviewed below did not identify a general requirement that a
lawyer or CA pre-approve these policies before launch.

## Launch blockers

1. The owner must complete the Vercel Pro purchase and cost controls before
   commercial launch, not before the current production-shaped pre-launch gate.
2. Production Vercel, domain/TLS, Dodo Test Mode, Resend, Turnstile, Sentry,
   Supabase Auth, and Cloudflare target configuration must be certified. The
   shared Supabase exception and controlled credential sharing are authorized.
3. Exact release candidate `a44649064f2334ecd8340439cec9235481ca34d5`
   passed required CI. The production-shaped non-destructive smoke and one full
   synthetic Dodo Test Mode purchase must pass before this gate closes.
4. Live payment/refund activation requires a fresh owner authorization after a
   separately authorized founder-owned low-value live transaction reconciles
   exactly once through Dodo, the provider event, payment record, immutable
   ledger, projections, board, email, and reconciliation.

Cloudflare daily cadence, the isolated scheduled-failure path, and owner receipt
of its Sentry email are recorded separately and passed. Independent missing-run
check-ins are deployed through Sentry; an intentionally missed run was not
manufactured and does not hold this work open absent a relevant failure.

## Owner/provider/legal/accounting gates

### Dodo Payments

The owner confirms that the merchant account, identity/business verification,
bank/payout setup, live payment capability, and GoneViral brand configuration
are complete and that the account supports the sponsored-listing model. This
owner attestation closes the old generic KYC/bank and separate-written-approval
blockers. It is not represented as a GoneViral-specific written approval.

Immediately before the authorized live test, the owner must verify in the Dodo
dashboard that there is no pending compliance action and that the exact live
business, verified brand, one-time INR pay-what-you-want product, API key,
webhook key, return URL, webhook URL, and payout bank all belong to the same live
environment. Dodo's merchant-acceptance policy remains an ongoing provider
condition and permits case-by-case review or later enforcement.

### Legal and privacy

Policy version `2026-09-04-v2` describes paid advertising placement, cumulative
provider-confirmed ordering, changing positions, moderation, no guaranteed
traffic/clicks/sales/rank duration, no votes/prizes/winnings/investment/gambling
or financial return, and a final-after-supply refund rule with exceptions for
verified duplicate/erroneous charges, failure to supply, provider-required
adjustments, and non-waivable law. It also names the operator and Grievance
Officer and describes reports, appeals, privacy requests, retention, providers,
and Dodo's merchant-of-record role.

The Consumer Protection (E-Commerce) Rules require prominent operator and
principal-address details, customer-care/grievance contacts, an adequate
grievance process, and accurate refund and service information. They require
the address on the platform but do not require it to be repeated in Terms,
Privacy, Refunds, paid-placement copy, checkout, every footer, or metadata. The
least-duplicative implementation is one dedicated Contact/operator disclosure,
prominently linked from the footer, checkout, and relevant policies. The
current 48-hour acknowledgement and 30-day ordinary-resolution targets match
the rule's outer timings. The exact address/privacy analysis is in
`PHASE_15_GST_OPERATOR_AND_ADDRESS_RESEARCH.md`.

The owner authorized only `4th Cross Road, Noor Khan Colony, Kalaburagi,
Karnataka 585104, India` for that dedicated disclosure. House/flat number,
premises/building name, landmark, and reconstructed premise-level details remain
private and prohibited from source or public output. Because Rule 4(2) does not
define the required component-level precision, the owner accepts the residual
compliance risk that this privacy-minimized form may be considered incomplete.
It is not lawyer-approved and is no longer an engineering blocker.

The 13 November 2025 commencement notification phases most substantive Digital
Personal Data Protection Act duties and corresponding Rules to eighteen months
after publication. The current policy and controls prepare for them, but the
owner must re-check the then-current Act/Rules and operational notice/consent,
rights, children, retention, security, breach, and grievance procedures before
that future commencement date. This time-bound re-check is not evidence of
current professional approval.

### GST, invoices, and accounting

Dodo publicly documents that it acts as merchant of record/legal seller for the
customer transaction, calculates and remits customer-side transaction taxes,
and generates an invoice carrying Dodo's tax details for each successful
transaction. The current design therefore treats the Dodo document as the
customer transaction invoice and does not issue a second GoneViral/AltCorp
customer tax invoice. The application keeps the placement ledger and bounded
provider payment/adjustment identifiers; it does not store customer billing
addresses, tax breakdowns, Dodo fees, or payout settlements and is not the
statutory accounting ledger. Any required operator-to-Dodo supplier invoice,
self-billing, payout, GST, or income-recognition treatment remains an owner
accounting decision based on the genuine provider agreement and documents.

The owner supplied authoritative operator/tax data: Syed Irfan Ullah Quadri is
the legal proprietor, AltCorp is the GST trade name/operator, the constitution
is proprietorship, and the Karnataka Regular registration is effective from
11 December 2025. GoneViral is the product brand. The unrelated additional
trade name must not appear on GoneViral surfaces. The exact GSTIN is intentionally
not stored in this public repository or rendered on the site while its public
lookup would expose the unresolved principal-place details.

Before live activation, the owner must verify one genuine Dodo live invoice
shows Dodo as the correct legal seller, GoneViral product/brand, customer
details, Dodo tax details, and tax breakdown; inspect the corresponding Indian-
business payout/reverse invoice; export the transaction, refund, fee, and payout
reports; and define how net payouts and provider documents are recorded in
AltCorp's books and GST/income-tax filings. CBIC rules require an AltCorp-issued
tax invoice, if one is genuinely required for a separate supply, to carry the
supplier's legal name, genuine address, and GSTIN plus the other prescribed
fields. Do not expose those fields on Dodo's customer invoice merely as brand
details.

## Ordered production rollout

### Prepare now; no production authorization required

1. Keep `vercel.json` free of cron definitions so Cloudflare remains the only
   scheduler. Preserve Mumbai (`bom1`) application/database proximity.
2. Finalize policy version `2026-09-04-v2` and its checkout acceptance snapshot
   with the authorized privacy-minimized address only on the dedicated Contact
   disclosure. Historical `2026-08-29-v1`
   acceptances and in-flight attempts retain their stored versions; no payment
   or ledger history is reinterpreted or migrated.
3. Freeze one release candidate after focused tests and the single required CI
   boundary. Batch policy, topology, and evidence documentation in that same
   candidate.
4. Configure the exact Production values without exposing their contents. The
   owner explicitly permits controlled reuse of the existing Preview Supabase,
   Dodo Test Mode, Resend, Sentry, and scheduler-related values during
   pre-launch. Vercel Production must contain:

   - public: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
     `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
     `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_SENTRY_DSN`;
   - database/storage: `DATABASE_URL` (transaction pool),
     `DATABASE_DIRECT_URL` (direct/session), `SUPABASE_SECRET_KEY`;
   - payment for the current pre-launch gate:
     `DODO_PAYMENTS_ENVIRONMENT=test_mode`,
     `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_BUSINESS_ID`,
     `DODO_PAYMENTS_PRODUCT_ID`, `DODO_PAYMENTS_WEBHOOK_KEY`, and
     `PAYMENTS_ENABLED=true`;
   - email/abuse/crypto: `EMAIL_DELIVERY_MODE=resend`, `RESEND_API_KEY`,
     `RESEND_FROM_EMAIL=notifications@updates.goneviral.in`,
     `RESEND_REPLY_TO=goneviral.in@gmail.com`,
     `RESEND_WEBHOOK_SECRET`, `TURNSTILE_MODE=cloudflare`,
     `TURNSTILE_SECRET_KEY`, `SUBMISSION_HMAC_SECRET`,
     `CLICK_HMAC_SECRET_CURRENT`, optional rotation predecessors,
     `PRIVATE_DATA_ENCRYPTION_KEY`, optional rotation predecessor, and
     `CRON_SECRET`;
   - build monitoring: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and
     `SENTRY_PROJECT`.

### Final owner authorization boundary

5. For the authorized pre-launch gate, keep Vercel Hobby and do not purchase or
   upgrade the plan. Immediately before commercial launch, upgrade the intended
   Vercel team to Pro. Keep one paid deploying seat where
   practical, inventory team-wide projects/add-ons, set the lowest acceptable
   on-demand budget, enable the available hard pause for production deployments,
   and verify web/email/SMS alerts. Record only sanitized plan and control
   evidence.
6. Preserve and use the existing hosted `goneviral` Supabase project in Mumbai;
   do not create, reset, or duplicate it. Verify its reviewed migrations,
   schema/Data API boundaries and advisors, set exact
   `https://goneviral.in` Site URL and `/auth/callback`, configure verified
   Resend custom SMTP with link tracking disabled, set rate limits, enroll the
   production admin with MFA/AAL2, and establish the accepted encrypted daily
   backup/staleness procedure. Supabase Free remains an owner-accepted risk:
   possible inactivity pause, no managed PITR, self-managed backup dependence,
   and recovery downtime.
7. Configure and verify the Production email domain/subdomains, SPF, DKIM, and
   DMARC; application Resend webhook; the current Dodo Test Mode webhook and
   dynamic return URL; Turnstile production hostnames; Sentry project,
   source-map upload, environment, safe test event, issue alert, and owner
   notification destination. Replace and re-verify Dodo URLs again only at the
   later separately authorized Live Mode gate.
8. Move the sole Cloudflare scheduler target from Preview to the Production
   base URL only after `goneviral.in` is verified and serving. Preserve the same
   four UTC triggers and five fixed routes, and prevent duplicate Preview plus
   Production business execution. A separate Worker is not required for this
   pre-launch gate.
9. Preserve the verified backup architecture, confirm provider refunds remain
   off, deploy Production with Dodo Test Mode and payments enabled, then attach
   and verify `goneviral.in`, TLS,
   canonical/robots/sitemap behavior, and DNS only under that authorization.
10. Run the narrow Production-shaped smoke: public/legal pages, Auth magic
    link, owner/admin authorization, Storage, Resend delivery/webhook,
    Turnstile, Sentry alert delivery, Dodo webhook authentication without a
    fabricated event, Cloudflare scheduled-route authorization, operational
    health/reconciliation reads, backup freshness, and rollback/pause action.
11. Before Dodo Live Mode, obtain one destructive-cleanup authorization, use the
    repository cleanup command to remove all synthetic/Test Mode business data,
    and verify the board and every ranking-affecting Test Mode financial artifact
    are clean while schema, migrations, configuration, secrets, and required
    system data remain. Then prevent accidental Preview contamination. Only
    after that obtain separate immediate authorization for one founder-owned
    low-value live transaction. Verify exactly-once end to end and inspect its
    genuine Dodo invoice/accounting evidence. Only then obtain separate approval
    to enable new payments; keep provider refunds disabled until their own gate.

## Optional deferred checks

- external lawyer and chartered-accountant review;
- broad visual/manual-device, keyboard, screen-reader, and exhaustive
  accessibility recertification;
- external penetration testing and non-launch-critical hosted edge cases;
- paid Vercel/Supabase upgrades beyond Vercel Pro, unless measured limits or an
  incident create a new launch blocker;
- direct Sentry monitor-UI inspection and an intentionally missed-run email test;
  do not manufacture either by breaking or redeploying the real scheduler.

## Authoritative references reviewed

- Vercel [Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines),
  [Hobby plan](https://vercel.com/docs/plans/hobby), and
  [pricing](https://vercel.com/pricing)
- Dodo [Merchant Acceptance Policy](https://docs.dodopayments.com/miscellaneous/merchant-acceptance),
  [Merchant of Record introduction](https://docs.dodopayments.com/features/mor-introduction),
  and [FAQ](https://docs.dodopayments.com/miscellaneous/faq)
- Department of Consumer Affairs [Consumer Protection (E-Commerce) Rules,
  2020](https://consumeraffairs.nic.in/sites/default/files/E%20commerce%20rules_0.pdf)
  and [2021 amendment](https://consumeraffairs.nic.in/sites/default/files/Consumer%20Protection%20%28E-Commerce%29%20%28Amendment%29%20Rules%2C%202021.pdf)
- MeitY [DPDP Act commencement notification G.S.R. 843(E)](https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf)
  and [DPDP Rules, 2025](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf)
- CBIC [tax invoice rules](https://cbic-gst.gov.in/gst-invoice-rules.html),
  [IGST Act place-of-supply provisions](https://cbic-gst.gov.in/hindi/IGST-bill-e.html),
  and [accounts and records rules](https://cbic-gst.gov.in/accnt-record-rules.html)
- Supabase [Production Checklist](https://supabase.com/docs/guides/deployment/going-into-prod),
  [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls),
  [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), and
  [changelog](https://supabase.com/changelog.md)
- Resend [domain authentication](https://resend.com/docs/dashboard/domains/introduction)
- Cloudflare [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/),
  [Secrets](https://developers.cloudflare.com/workers/configuration/secrets/),
  and [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
