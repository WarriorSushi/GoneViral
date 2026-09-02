# Clicks, public activity and sharing

Phase 11 exposes engagement only after its privacy and truthfulness controls are
active. None of these signals participates in Main or Today ranking. The
financial ledger and deterministic ranking rules remain the only rank authority.

## Safe outbound redirects

Public links use `/go/[slug]`. The handler never accepts a destination query
parameter. It loads the stored destination, requires an active, moderation-clear,
positive listing in an active category, and runs the destination URL safety
validator again immediately before a temporary `307` redirect. Responses are
`no-store`, suppress referrer disclosure and use `nosniff`. A missing, hidden,
disabled or newly unsafe listing returns `404`. The server does not fetch or
preview the destination.

`outbound_redirects_enabled` is an audited admin emergency flag. Turning it off
blocks all outbound resolution without changing listing or rank state.

## Privacy-safe click aggregate

An intentional human GET can count once per listing per IST business day. Known
bot, link-preview, prefetch and prerender requests are suppressed. The dedupe key
is an HMAC over a domain label, listing ID, IST date, request address and a
bounded user-agent value. Raw addresses, emails and user agents are never stored
in the click tables or emitted by the failure log.

Configure a strong `CLICK_HMAC_SECRET_CURRENT`. During rotation, move the old
value to `CLICK_HMAC_SECRET_PREVIOUS` and deploy the new current secret. The
reader checks both digests but writes only the current digest, so overlap does
not count a returning visitor twice. Remove the previous secret after the
eight-day overlap window.

`private.click_dedupe` rows expire after eight days. The authenticated daily
`/api/cron/cleanup-retention` job deletes expired rows. Daily counts in
`app.listing_click_daily_totals` are longer-lived non-personal aggregates;
their final deletion period follows the effective Privacy Policy and the
owner-approved retention schedule.
An aggregate failure never traps a visitor on GoneViral.in: redirect continues
and the server logs only a public listing reference and error class.
The fixed daily GitHub schedule and guarded activation procedure are documented
in `GITHUB_SCHEDULED_OPERATIONS.md`.

## Public activity and sharing

The public activity list is derived only from committed positive ledger entries
for listings that remain publicly eligible. Its DTO contains listing public
identity, an allowlisted movement label, amount, committed timestamp and actual
current rank. It contains no payer, email, provider payment, dispute or private
owner fields and has an explicit empty state instead of synthetic events.

Listing metadata, the generated share image and share controls use the current
rank returned by the public read model. The image states that placement is
sponsored, names GoneViral.in and timestamps the snapshot. Confirmation pages
offer share controls only when the post-commit query returned an actual public
rank. Web Share, copy and image download are conveniences only; they neither
reserve nor alter a position.

## Verification and operating gates

Run `pnpm test`, `pnpm test:database`, `pnpm build` and `pnpm test:e2e`. Database
verification additionally uses `pnpm db:migrations:verify`,
`pnpm db:schema:verify`, `pnpm db:lint` and `pnpm db:advisors` when the local
Supabase/Docker control plane is available.

No hosted click traffic, production secrets, legal approval or share-network
preview test is represented as complete. Dodo Payments remains the current,
replaceable payment provider; click, activity and sharing code has no provider
dependency.
