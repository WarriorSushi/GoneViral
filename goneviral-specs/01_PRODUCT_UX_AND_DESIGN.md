# 01 — Product UX and Design

**Depends on:** `00_DECISIONS_AND_PRODUCT_RULES.md`  
**Design direction:** Editorial Signal Board  
**Primary principle:** the leaderboard is the product, not a hero section hiding above it

---

## 1. Experience thesis

GoneViral should feel like a premium public scoreboard and a serious advertising product that happens to be entertaining.

The user should understand within five seconds:

1. these are paid sponsored positions;
2. higher confirmed sponsorship ranks higher;
3. the current amounts are public;
4. anyone eligible can sponsor or raise;
5. the exact current price to take a position is available.

The emotional loop is:

```text
see the board -> understand the current price -> sponsor/raise -> wait for real confirmation -> see the board move -> share the truthful result
```

Do not bury this loop beneath company copy, feature grids, fake counters or a giant decorative hero.

---

## 2. Design personality

### Intended feeling

- culturally current without slang overload;
- premium, tactile and editorial;
- slightly provocative but financially trustworthy;
- dense enough to feel alive, calm enough to process money;
- recognisably Indian through currency, language rhythm and context, not flag colours or stereotypes.

### Avoid

- casino, betting, trading-terminal or crypto visuals;
- purple/blue SaaS gradients;
- glassmorphism and floating translucent cards;
- giant hero headlines that push the board below the fold;
- neon dark-mode-by-default ambience;
- fake “live” dots, fake viewers or fabricated urgency;
- excessive crowns, flames, confetti or gold everywhere;
- tricolour branding;
- copied Outbid/Million Dollar Homepage layouts;
- generic component-library appearance.

### Visual metaphor

Think: an independent magazine's front page crossed with an airport departures board and a beautifully printed market index. Amounts and movement are signals. Whitespace, typography and rules make them legible.

---

## 3. Design tokens

Use semantic CSS variables. The values below are the initial system, not optional inspiration.

```css
:root {
  --canvas: #fbfaf7;
  --surface: #ffffff;
  --surface-raised: #ffffff;
  --surface-muted: #f5f2ec;
  --ink: #1c1917;
  --ink-soft: #6c6760;
  --ink-faint: #6d675f;
  --line: #e8e3db;
  --line-strong: #d8d0c5;
  --signal: #9f2d36;
  --signal-hover: #7d202b;
  --signal-soft: #faeeee;
  --success: #1d6f4a;
  --success-soft: #dceee4;
  --warning: #9a5a00;
  --warning-soft: #f7e9ca;
  --danger: #b42318;
  --danger-soft: #fee4e2;
  --gold: #a87518;
  --gold-soft: #f4e8c9;
  --focus: #2855d9;
  --shadow-1: 0 1px 2px rgb(20 18 15 / 0.08);
  --shadow-2: 0 10px 30px rgb(20 18 15 / 0.1);
}
```

### Colour rules

- Canvas is warm stone, not pure white.
- Primary CTA is deep burgundy. Do not introduce a competing orange CTA.
- Gold appears only as a restrained #1 accent, never as a full theme.
- Green means confirmed/success, never “good ranking.”
- Red means error/destructive, not rank movement.
- Amounts and rank remain readable without colour.
- All text/background combinations must pass WCAG 2.2 AA.

### Typography

- `Geist Sans`: interface, copy and listing names.
- `Geist Mono`: amounts, rank, timestamps, technical identifiers.
- Use `font-variant-numeric: tabular-nums` for money/ranks.
- Maximum display heading: approximately `clamp(2.25rem, 7vw, 5.5rem)` only on controlled marketing/legal pages; homepage masthead is much smaller.
- Body: 16–18px desktop, minimum 16px mobile.
- Dense board metadata: no less than 13px where contrast remains strong.

### Spacing and shape

- 4px spacing base.
- Core spaces: 4, 8, 12, 16, 24, 32, 48, 64.
- Board/table row radius: 0–8px, not pill-everything.
- Input/card radius: 10–14px.
- CTA radius: 10px or compact pill only where appropriate.
- Borders: usually 1px solid line token.
- Use shadows sparingly; hierarchy should mostly come from spacing, borders and surfaces.

### Motion

- 120–220ms for micro-interactions.
- 250–400ms for committed rank transition/celebration.
- No perpetual pulsing/bouncing.
- Respect `prefers-reduced-motion`; reduce to opacity/no movement.
- Never animate an unconfirmed rank as if final.

---

## 4. Responsive structure

### Breakpoints

Use content-driven Tailwind breakpoints, with behaviour roughly:

- `< 640px`: stacked mobile board cards and full-screen/bottom-sheet actions;
- `640–1023px`: hybrid board rows;
- `>= 1024px`: dense editorial table with optional sticky rail;
- very wide: content max around 1440px; do not stretch rows endlessly.

### Mobile priorities

- Board and amounts remain first.
- Category tabs horizontally scroll with visible overflow affordance.
- Primary “Sponsor your spot” remains reachable but does not cover rows.
- A board row opens a details/action sheet rather than cramming every metric.
- Minimum 44×44px touch targets.
- No horizontal page scrolling at 320 CSS px.

### Desktop priorities

- Main/Today/category controls, disclosure and board appear in first viewport.
- Exact takeover CTA is visible in the active/hovered row without making every row noisy.
- Optional right rail can show “How it works” and recent movement after the board has enough data.

---

## 5. Global information architecture

```text
/
/today
/category/[slug]
/l/[listingSlug]
/go/[listingSlug]
/join
/join/[attemptPublicId]
/join/[attemptPublicId]/pending
/join/[attemptPublicId]/confirmed
/manage
/manage/[listingSlug]
/manage/[listingSlug]/raise
/manage/[listingSlug]/history
/manage/[listingSlug]/settings
/auth/callback
/report/[listingSlug]
/how-it-works
/terms
/privacy
/refunds
/content-policy
/contact
/admin/*
```

`/`, `/today` and category pages are board variants sharing one visual system. Listing detail is useful but never replaces the board as the main product.

---

## 6. Global header

Public copy amendment (approved 2026-08-28): all customer-facing examples in
this document must be rendered with the plain-language vocabulary from `00`.
Do not expose the internal words `sponsor`, `sponsorship`, or `sponsored rank`
in navigation, headings, forms, status messages, or legal placeholders.

### Desktop

Left:

- GoneViral wordmark;
- no descriptor beside the wordmark.

Centre/primary nav:

- Main;
- Today;
- Categories (popover/drawer);
- How it works.

Right:

- Manage my listing;
- primary `Get listed`.

### Mobile

- compact wordmark;
- `Join` CTA;
- menu button opening navigation/manage/legal links.

### Header behaviour

- sticky after initial scroll, with opaque surface and bottom border;
- no translucent blur dependency;
- active route uses underline/ink, not glowing pills;
- “Manage” may open email magic-link entry when signed out.

---

## 7. Homepage `/`

### First viewport hierarchy

1. Compact masthead:
   - restrained eyebrow: `INDIA'S PUBLIC SPONSORED LEADERBOARD`;
   - headline: `Pay more. Rank higher.`;
   - compact explanation: `Put your brand, product or profile on the board. Higher confirmed spend takes the higher spot.`;
   - primary action: `Get listed from ₹499`;
   - lightweight secondary link: `How it works →`.
2. Board switcher: Main / Today, without an explanatory label.
3. One category row, without an explanatory label.
4. Live board.

The homepage masthead does not repeat the no-votes/no-algorithm/no-account or
paid-leaderboard disclosure. Those truths remain available on How it works,
paid placement, rules, and legal surfaces.

Multiple board rows should be visible without scrolling on a typical laptop.
At 390×844, the beginning of rank #1 must appear in the first viewport.

### Empty state

Never seed production with pretend entries.

```text
No one is here. Yet.
Get on the leaderboard from ₹499.
[See how it works]
```

Optional secondary explanation: `Real payments only. No votes. No algorithm.`

### Low-population state

Show real entries, then a visually distinct invitation row:

```text
#4 could be yours
Current minimum: ₹499
```

Do not invent absent ranks or fake activity.

---

## 8. Board component

### Desktop columns

| Column          | Content                                                           |
| --------------- | ----------------------------------------------------------------- |
| Rank            | `#1`, `#2`, …                                                     |
| Identity        | logo/avatar, name, tagline, category                              |
| Confirmed total | primary formatted INR amount                                      |
| Signal          | optional privacy-safe clicks or latest movement, clearly labelled |
| Action          | exact current `Take #N for ₹X` or `Raise` for owner context       |

A dense row should be scan-friendly, approximately 72–88px tall.

Public board routes show 10 paid listings per page and use stable cursor
pagination for additional positions.

The first three rank markers use one matching outline-laurel family around the
rank number: restrained gold for #1, cool silver for #2, and bronze for #3.
Rank #1 may include a tiny `LEADER` label. Their row surfaces carry matching,
very subtle tonal cues. A quiet `TOP 3` boundary appears only when rank #4
exists. A `TOP 20` boundary appears only when the board extends beyond rank #20;
neither boundary implies scarcity.

### Mobile row/card

Top row:

- rank ornament;
- logo;
- name, two-line-max description, category, truncated domain, and the quiet
  independent `See details →` link.

Bottom row:

- confirmed spend, `confirmed total`, and public click count on the left;
- the exact `Take #N · ₹X` action on the right.

Cards and Recent Moves never require horizontal scrolling. On mobile, Recent
Moves is a compact vertical list. The category rail is the only horizontally
scrollable homepage content because its full option set cannot fit one row; its
scrollbar is visually hidden while touch scrolling remains available.

### Top three treatment

- #1: subtle gold rule/background marker, not a giant crown.
- #2/#3: modest density/weight distinction.
- all amounts remain same semantic meaning.
- no podium that pushes the rest below fold.

### Row interactions

- clicking anywhere on a listing row, except its action buttons, opens the
  listing's approved HTTPS website in the same tab;
- a quiet inline `See details` text link opens the GoneViral listing-detail
  route without competing with the card-wide website destination;
- on hover or keyboard focus, the `Take #N · ₹X` action sits across the card's
  top border; it stays visible on touch devices where hover does not exist;
- the take-rank button opens the join flow with a target snapshot;
- keyboard focus state is obvious;
- hover never contains essential-only information.

### Row density and detail

- Keep the board slightly narrower than the full page on wide screens so rank,
  identity, actions and amount read as one unit rather than four distant islands.
- Show the product name, up to two lines of description, category and destination
  host on every card, including mobile.
- Keep the confirmed amount visually clear but smaller than the product name and
  rank action.
- Do not show click counts until Phase 11's first-party redirect, human/bot
  filtering, dedupe and privacy-safe aggregate are implemented. Never seed or
  invent a public click number.

### Loading

Server-render the board. Use route-level skeleton only during navigation/revalidation; rows have stable dimensions. Never replace visible data with a full-screen spinner.

### Staleness

Board shows a quiet exact IST update time and a manual refresh button. Do not
label cached data as realtime or use a fake live-status indicator. Do not imply
every row is a reservation. After payment confirmation, the affected board is
invalidated and the customer sees actual result.

---

## 9. Main / Today switcher

Use segmented tabs or underlined tabs, not a vague toggle.

Main helper:

> `All-time confirmed cumulative sponsorship.`

Today helper:

> `Confirmed sponsorship added today, net of reversals posted today. Resets at midnight IST.`

Today rows show both:

- today's net amount as primary;
- lifetime confirmed total as secondary.

At IST midnight, the Today route naturally changes business date and cache key. Empty copy:

```text
Today's board is wide open.
The first confirmed sponsorship today takes #1 here.
```

---

## 10. Category filtering

- `All` plus six fixed categories.
- URL route is canonical and shareable: `/category/tech-apps`.
- Mobile tabs horizontally scroll.
- Changing category preserves Main context, not Today unless explicit future feature.
- Show category definition in optional info affordance.
- Empty category invites a real first sponsor without claiming scarcity beyond fact.

---

## 11. Listing detail `/l/[slug]`

Purpose: provide context and conversion without pretending to be a social profile.

### Sections

1. Identity:
   - logo;
   - name/tagline;
   - category;
   - outbound visit.
2. Rank snapshot:
   - current Main rank;
   - confirmed cumulative total;
   - Today amount/rank when non-zero;
   - clear `Sponsored placement` label.
3. Action:
   - `Raise your position` for owner;
   - `Take #N` for another sponsor flow;
   - current quote timestamp/disclaimer.
4. Public-safe movement timeline:
   - joined;
   - added ₹X;
   - reached #N;
   - no payer/provider/dispute detail.
5. Report link.

A suspended/removed listing returns not-found/public-unavailable and never redirects outbound.

---

## 12. Join flow

Use a focused multi-step form. Desktop may be a centred panel; mobile is a page, not a cramped modal.

### Step 0 — entry context

Possible entry:

- sponsor a new listing;
- take a target position;
- raise owned listing.

Show:

- target/current board snapshot;
- exact current minimum;
- advisory: `Positions can move while payment is being confirmed.`

### Step 1 — listing

For new listing:

- name;
- short tagline;
- destination URL;
- category;
- optional logo.

Validation is inline and plain-language. Destination field explains HTTPS and prohibited content. Duplicate destination returns safe recovery/existing-listing path. Deterministic content/URL/risk screening runs automatically; low-risk listings can clear without manual review, while ambiguous submissions show an honest `Review may be required` state.

For raise:

- immutable listing identity summary;
- no re-entry of destination/category;
- must have owner session.

### Step 2 — amount

Inputs:

- whole INR amount;
- preset chips based on actual rules, e.g. `Minimum`, `Take #3 — ₹X`, `Take #1 — ₹Y`;
- custom amount.

Always show:

- amount to pay now;
- current confirmed total;
- estimated new total;
- estimated rank from current snapshot;
- minimum raise formula for owner flow;
- `This is cumulative sponsorship, not a refundable wallet balance.`

If board changes during form entry, recalculate softly and explain. Never auto-raise the entered/charged amount.

### Step 3 — contact and review

Collect email before initial checkout. Also collect invoicing/customer fields only as required by approved legal/accounting/provider setup.

Review card:

```text
Sponsor: Acme
Destination: https://acme.example
Category: Tech & Apps
Pay now: ₹2,001
Estimated confirmed total: ₹10,001
Current estimate: #1
```

Disclosures:

- paid sponsored ranking;
- position can change;
- no traffic/click/sales/virality guarantee;
- provider checkout;
- Terms/Privacy/refund/content links.

Checkbox wording must not claim legally invalid waiver; use reviewed consent copy.

### Step 4 — create checkout

- require valid Turnstile token on risk-triggered/high-value/new-listing submissions;
- disable CTA while request in flight;
- use request idempotency key so retries do not produce duplicate intents;
- on provider creation success, redirect/open official hosted checkout;
- on provider temporary failure, preserve draft and offer safe retry;
- never expose secret keys/provider signature material.

---

## 13. Payment return and pending experience

Route: `/join/[attemptPublicId]/pending`

Heading:

> `Confirming your sponsorship`

Body:

> `Your checkout has returned. We’re verifying the payment directly with the provider before changing the board.`

Show listing and amount. Poll no-store status with bounded backoff. Do not show a new rank until database state is confirmed.

States:

### Processing

- calm progress indicator;
- `This usually updates automatically. You can safely close this page; we’ll email you.`

### Confirmed

Transition to confirmed result.

### Failed/dropped/expired

- `No confirmed payment was applied.`
- retry creates/reuses safe attempt rules;
- no misleading success colour.

### Needs verification/quarantined

- `The provider returned a payment that needs manual verification. We have not changed the board yet.`
- support reference safe public ID;
- no accusatory fraud wording.

### Long delay

After active polling window:

- stop aggressive requests;
- `Still checking. Refresh later or use the email we send.`
- manual `Check again`;
- link to support.

---

## 14. Confirmed result

Route: `/join/[attemptPublicId]/confirmed`

Render only after owner-authorised or possession-safe status lookup proves confirmed.

### New listing

```text
₹2,001 confirmed.
Acme is now #4.
```

Then:

- actual confirmed total;
- actual rank;
- movement (`up 3 positions`) if truthful;
- `View the board`;
- `Share your rank`;
- `Email me a secure management link` / magic-link state.

### Rank moved during payment

```text
₹2,001 was confirmed and added to Acme.
The board moved while payment was processing, so Acme is currently #5.
```

No fake apology or promise.

### Confirmation celebration

- brief line/number transition;
- optional restrained paper-strip/confetti effect once;
- no casino sounds;
- disabled under reduced motion;
- no celebration for pending/quarantined states.

---

## 15. Manage entry `/manage`

Signed out:

```text
Manage your GoneViral listing
Enter the email used to sponsor. We’ll send a secure sign-in link if a listing is associated with it.
```

Response is always enumeration-safe:

```text
If that email can manage a listing, a secure link is on its way.
```

Signed in:

- list owned listings;
- rank, total, status;
- primary `Raise position`;
- warnings for pending review/suspension;
- no public search/listing enumeration of other owners.

---

## 16. Owner dashboard `/manage/[slug]`

### Overview

- current public eligibility/status;
- Main rank and total;
- Today amount/rank;
- minimum next raise;
- exact take-next/take-#1 quotes;
- destination preview;
- recent private payment history summary.

### Primary actions

- Raise position;
- Edit listing;
- View/share public listing;
- View payment history;
- request category/destination change;
- contact support.

### Status banners

- pending moderation: `Your payment is confirmed, but the listing is being reviewed before public display.`
- suspended: show reason category when legally appropriate, appeal/contact path, and explicitly say new raises are unavailable.
- inactive reversed: `The confirmed total is ₹0 after a reversal. Your original sponsorship and history remain.`
- removed: support/manual-only.

---

## 17. Raise flow

- owner-authenticated only;
- fixed listing identity;
- show original sponsorship, current total and exact minimum;
- do not let a non-owner “raise” another listing through this route; they create their own listing/sponsor action instead;
- quote target positions from current server state;
- disclose that concurrent movement can change actual rank;
- same authoritative pending/confirmed flow.

Copy example:

```text
Original sponsorship: ₹8,000
Minimum raise: ₹1,000
Current total: ₹12,000
₹3,001 currently passes #2.
```

---

## 18. Edit listing flow

Separate safe immediate edits from reviewed changes.

### Immediate after server validation

- tagline;
- sanitized logo;
- minor display-name correction;
- allowed path/query change under same approved host.

### Review request

- destination host;
- category;
- material identity/name;
- any field when listing is flagged.

The current public value stays live during review. UI shows request state and no duplicate requests. Never allow owner to change the entity into an unrelated sponsor.

---

## 19. Payment history

Private owner view:

- internal receipt/reference;
- created/confirmed dates;
- sponsorship type;
- amount;
- state;
- reversal/restoration line items;
- invoice/receipt link when available;
- support link.

Do not expose raw provider payload/signature, secret IDs or admin notes.

Public movement history is a separate, redacted projection.

---

## 20. Reports

Entry: `Report this listing` on detail and redirect warning where relevant.

Form:

- category: harmful/illegal, impersonation, scam, malware/phishing, adult, IP/counterfeit, other;
- short explanation;
- optional email for follow-up;
- Turnstile/rate limits.

Success:

```text
Report received. Reports are reviewed; report count does not automatically change rank.
```

Do not show report counts publicly.

---

## 21. Admin UX

Admin is functional, fast and auditable; it need not mimic marketing surfaces.

### Dashboard

- provider/database health;
- new payments, pending/quarantined/duplicate-paid;
- reconciliation mismatches;
- new reports/change requests;
- suspended/removed counts;
- failed email/webhook work;
- operational flags/read-only mode.

### Listings queue

Filters:

- moderation state;
- lifecycle;
- category;
- report count/risk reason;
- payment state;
- date/search.

Detail includes public listing, destination, owner identity, ledger total and entries, provider payments, reports, change requests and complete admin audit timeline.

### Admin actions

- clear/suspend/unsuspend/remove;
- approve/reject destination/category/name change;
- release/reassign canonical destination with evidence;
- mark duplicate-payment workflow;
- resend owner email;
- add internal note;
- initiate provider refund only through a dedicated two-stage process where policy permits.

Every sensitive action requires reason, confirmation and immutable audit. High-impact actions should support re-authentication/second confirmation.

---

## 22. Legal and trust pages

### How it works

Keep the public page short enough to scan in one desktop viewport. Explain only:

1. add your work;
2. pay ₹499 or more to be on the leaderboard;
3. pay more to move up.

Add a short `Good to know` list for the Today reset, no click/sales promise,
server confirmation, and unavailable pre-launch features. Put detailed rules in
the relevant transaction UI and counsel-reviewed legal pages, not on this page.

### Terms / Privacy / Refund / Content policy

Use counsel-reviewed content. Product UI must link them from footer, checkout, report and owner flows. Pages need effective date/version, contact/grievance details and accessible typography.

---

## 23. Footer

Compact, not a mega sitemap.

- plain paid-ranking disclosure;
- How it works;
- Terms, Privacy, Refunds, Content policy;
- Contact/report abuse;
- `© GoneViral.in`.

Do not claim “India's #1” without substantiation.

---

## 24. Copy system

### Preferred

- `Get listed`
- `Take #3 · ₹2,001`
- `Move up`
- `Payment confirmed`
- `Current estimate`
- `The list moved while we checked the payment`
- `Paid leaderboard. More money gets a higher spot.`

### Prohibited/misleading

- `Bid now` as the dominant customer verb;
- `Guaranteed #1`;
- `Buy permanent rank`;
- `Win the internet` as a transaction promise;
- `Investment`, `jackpot`, `winnings`, `pot`;
- `Only X spots left` when false;
- `Live viewers` without real measurement;
- `Verified brand` without a verification process;
- `Payment successful` based only on redirect.

### Amount formatting

Use Indian grouping:

```text
₹499
₹1,001
₹10,000
₹1,25,000
₹12,50,000
```

Use complete values in transactional UI; compact `₹1.25L` may appear only as secondary chart/display text with accessible full value.

---

## 25. Error and recovery patterns

### Validation

State what is wrong and how to fix it near the field. Preserve valid input.

### Duplicate destination

```text
This destination already has a GoneViral listing.
[View listing] [Manage it securely]
```

Do not reveal account/email information.

### Board changed

```text
The board moved. ₹2,001 would now place you around #4, not #3.
Your entered amount has not changed.
```

### Network failure after create attempt

Use idempotency key to retrieve/resume status; do not blindly create a new provider order.

### Unknown payment state

```text
We couldn't verify the final status yet. No board change is shown until confirmation.
```

### Public error pages

Use calm branded 404/500/maintenance surfaces. Never show stack traces, provider messages, email existence or raw database IDs.

---

## 26. Accessibility

Required:

- WCAG 2.2 AA target;
- semantic heading order, nav, main and tables/lists;
- board table with meaningful headers on desktop; card/list semantics mobile;
- visible focus with at least 2px focus indicator;
- keyboard-accessible menus, tabs, dialogs and sheets;
- focus trap/return for modal/sheet;
- announcements for form errors/payment status without noisy repeated live regions;
- text resizing to 200%;
- touch target minimum 44px;
- no information by colour alone;
- alt text for meaningful logos (`Acme logo`) and empty alt for decorative images;
- reduced-motion support;
- payment/countdown status not dependent on timing to act;
- accessible INR pronunciation/aria labels where symbol-only rendering is ambiguous.

Use Playwright + axe and manual keyboard/screen-reader checks before launch.

---

## 27. Performance UX

- Server-render/cached public boards for fast first content.
- Do not hydrate every row.
- Client components only for interactive controls/forms.
- Reserve image dimensions; use sanitized small logos.
- Avoid heavy animation/video/third-party embeds.
- No blocking analytics.
- Use suspense boundaries that preserve masthead/board frame.
- Disable prefetch on outbound redirect actions; filter framework/browser prefetch from click counts.

Target mobile p75 Core Web Vitals in `05`.

---

## 28. Component inventory

Build bespoke components from low-level primitives:

```text
SiteHeader
MobileNavSheet
SponsoredDisclosure
BoardTabs
CategoryTabs
Leaderboard
LeaderboardRow
LeaderboardCard
RankBadge
Money
ListingIdentity
MovementLabel
TakePositionButton
BoardEmptyState
BoardStaleNotice
ListingHero
PublicMovementTimeline
SponsorStepper
ListingFields
AmountComposer
TakeoverQuoteCard
CheckoutReview
PaymentStatusPanel
ConfirmedResult
ShareCardPreview
MagicLinkRequest
OwnerListingCard
OwnerStatusBanner
PrivatePaymentHistory
ChangeRequestForm
ReportForm
AdminQueueTable
AdminFinancialPanel
AdminAuditTimeline
LegalPageShell
SiteFooter
```

Prefer native semantics and a small internal primitive layer. Do not import a large component system merely to obtain buttons/cards.

---

## 29. Screen-level analytics events

Analytics never affects ranking and should avoid sensitive payloads.

Allowed examples:

```text
board_viewed { board: main|today|category }
listing_viewed { listing_public_id }
sponsor_started { entry_context, target_rank? }
amount_quote_viewed { quote_bucket, not exact email/provider data }
checkout_redirected { attempt_public_id, environment }
payment_result_viewed { state }
share_clicked { surface }
outbound_clicked { listing_public_id }
manage_magic_link_requested { generic_success }
report_submitted { reason_category }
```

Do not send destination query secrets, email, provider IDs, raw amounts tied to personal identity, reports or admin notes to general analytics.

---

## 30. UI acceptance checklist

- [ ] Homepage communicates paid ordering without scrolling/searching.
- [ ] Real board begins in first viewport on desktop.
- [ ] Production empty state has no fake listings/activity.
- [ ] Main, Today and category definitions are explicit.
- [ ] Every amount is correctly Indian-formatted and tabular.
- [ ] Takeover quote says current estimate/not reservation.
- [ ] Pending return never shows final rank.
- [ ] Confirmation shows actual post-commit rank.
- [ ] Mobile works at 320px and 200% zoom.
- [ ] Keyboard and screen reader can complete sponsor/manage/report flows.
- [ ] Suspended listing is absent from public board/detail/redirect.
- [ ] Owner/admin private data never enters public pages/cache.
- [ ] No casino, crypto, generic SaaS-gradient or fake-live patterns.
- [ ] Reduced motion works.
- [ ] Legal/disclosure links are present at checkout/footer.
- [ ] Admin sensitive actions require reason and show audit.
