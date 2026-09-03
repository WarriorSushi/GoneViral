# 00 — Decisions and Product Rules

**Status:** canonical source of truth  
**Policy version:** `2026-08-29-v2`
**Business time zone:** `Asia/Kolkata`

This document defines GoneViral's product behaviour. When another document is less precise, this one wins.

---

## 1. Product definition

GoneViral.in is a public paid sponsored leaderboard for legitimate people, creators, products, brands and organisations.

> **PAY MORE. RANK HIGHER.**

A customer purchases advertising placement. The current public order is determined only by cumulative server-confirmed sponsorship amounts, net of applied refunds, chargebacks and restorations.

Mandatory plain-language board disclosure:

> **Paid list. Money decides the order.**

This copy change does not change the advertising product, payment rules, ledger
semantics, or the internal canonical terms below.

### What the customer does and does not buy

The customer buys a variable sponsored position. The purchase does not include or guarantee:

- a permanent rank;
- a fixed number of impressions;
- clicks, followers, sales, press, backlinks or virality;
- editorial endorsement or verification;
- a prize, payout, balance or transferable asset;
- exclusivity.

Rank can fall whenever another eligible listing's confirmed total becomes higher or the listing's own total is reduced by a reversal.

### Non-goals

V1 is not a voting site, quality ranking, closing-time auction, wager, game of chance, prize competition, participant marketplace, wallet, token, investment, social network, subscription product or recommendation algorithm.

---

## 2. Locked V1 decisions

| Topic             | Rule                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| First sponsorship | ₹499 minimum; ₹2,14,74,836 current Dodo-checkout maximum                                      |
| Later raise       | At least `MAX(10% of original successful sponsorship rounded upward to a whole rupee, ₹1,000)` |
| Main ranking      | Current confirmed cumulative total, net of applied reversals                                   |
| Tie               | Earlier attainment of the equal current total wins                                             |
| Overtake          | Must exceed the target total by at least ₹1                                                    |
| Money             | Integer paise; customer-entered V1 amounts are whole rupees                                    |
| Today             | Net rank-affecting amount applied during current IST calendar day                              |
| Categories        | Filtered views of the same listing and ledger                                                  |
| First purchase    | No mandatory account before checkout                                                           |
| Management        | Email magic-link owner claim/session                                                           |
| Confirmation      | Authenticated server-to-server provider state processed transactionally                        |
| Current rank      | Derived; never customer-writable and never mass-rewritten                                      |
| Public freshness  | Cached reads + invalidation/manual refresh; no WebSockets                                      |
| Provider          | Dodo Payments behind a narrow adapter; replacements remain possible                           |

Any change needs a new policy version, migration impact analysis, tests and specification amendment.

---

## 3. Canonical terminology

| Term                            | Definition                                                                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Listing                         | Public sponsored identity representing one entity/destination.                                                                     |
| Owner                           | Supabase Auth user explicitly authorised to manage a listing.                                                                      |
| Original successful sponsorship | First positive sponsorship ledger entry applied to the listing; immutable forever.                                                 |
| Raise                           | Later positive sponsorship payment to the same listing.                                                                            |
| Confirmed sponsorship           | Positive provider settlement that passed signature, identity, amount, currency and idempotency checks and committed to the ledger. |
| Confirmed total                 | Sum of all rank-affecting ledger deltas for a listing.                                                                             |
| Current-total reached time      | Database application time of the latest rank-affecting delta; tie-breaker.                                                         |
| Target                          | Listing/position used to calculate an informational takeover amount.                                                               |
| Takeover quote                  | Current minimum payment calculated to exceed a target; not a reservation or guarantee.                                             |
| Payment attempt                 | GoneViral's immutable-intent checkout/order record.                                                                                |
| Provider payment                | Provider-side payment attempt identified by provider payment ID.                                                                   |
| Ledger entry                    | Immutable signed money delta applied to a listing.                                                                                 |
| Reversal                        | Refund, chargeback or correction represented by a negative delta.                                                                  |
| Main                            | Current cumulative lifetime sponsored leaderboard.                                                                                 |
| Today                           | Current IST-day net sponsorship-activity board.                                                                                    |
| Active                          | Financial lifecycle permits public display.                                                                                        |
| Suspended                       | Moderation hides the listing while financial history remains.                                                                      |
| Removed                         | Admin delisting; records remain.                                                                                                   |
| Inactive reversed               | Confirmed total is zero after reversal.                                                                                            |

Customer copy should use plain verbs: **add your work**, **pay**, **move up**,
**paid list**, **current total**, and **confirmed**. Do not use **sponsor**,
**sponsorship**, or **sponsored rank** in the public UI. Those remain internal
business, provider, database, and legal terms. Continue to avoid
auction/bet/win language.

Marketing copy should be short, confident, friendly, and lightly dry. The core
public promise is: **Pay to be on the GoneViral.in leaderboard. Get seen.** Use
**No sign-up. No API. No nonsense.** where the no-account first checkout and
direct website link are being explained. Do not imply guaranteed traffic.

---

## 4. Authoritative policy configuration

Implement these values once in a versioned domain module and mirror critical values with database checks. Never scatter literals.

```text
POLICY_VERSION                         = "2026-08-29-v2"
BUSINESS_TIME_ZONE                     = "Asia/Kolkata"
CURRENCY                               = "INR"
PAYMENT_GRANULARITY_PAISE              = 100
INITIAL_SPONSORSHIP_MIN_PAISE          = 49_900
INITIAL_SPONSORSHIP_MAX_PAISE          = 2_147_483_600
RAISE_PERCENT_NUMERATOR                = 10
RAISE_PERCENT_DENOMINATOR              = 100
RAISE_ABSOLUTE_FLOOR_PAISE             = 100_000
TAKEOVER_INCREMENT_PAISE               = 100
LISTING_NAME_MAX_GRAPHEMES             = 80
LISTING_TAGLINE_MAX_GRAPHEMES          = 160
DESTINATION_URL_MAX_BYTES              = 2_048
LOGO_UPLOAD_MAX_BYTES                  = 2_097_152
PAYMENT_ATTEMPT_EXPIRY_MINUTES         = 30
PENDING_STATUS_ACTIVE_POLL_SECONDS     = 60
```

Policy values require a versioned code change. Operational flags, cache lifetimes, rate-limit thresholds and provider environment are runtime configuration.

---

## 5. Money representation

- PostgreSQL: signed `bigint` paise.
- TypeScript domain: `bigint`.
- JSON/API: base-10 integer string, for example `"49900"`.
- UI: formatted INR.
- V1 customer inputs: whole rupees only (`amount_paise % 100 == 0`).

Never use JavaScript `number`, SQL floating point or provider-formatted strings for calculations.

Input parser accepts digits representing whole INR, rejects signs, decimals, scientific notation and overflow, then converts to paise.

Provider amount must exactly equal the internal attempt amount after validated conversion. A mismatch is quarantined and does not change rank.

---

## 6. Original successful sponsorship

The first positive sponsorship ledger entry sets `original_sponsorship_paise` exactly once in the same transaction.

It:

- never increases after raises;
- never changes after partial/full refund or chargeback;
- remains when the listing is suspended, removed or reaches zero;
- remains the basis of every future minimum raise;
- cannot be reset by deleting/recreating or refunding a listing.

A fully reversed listing does not become eligible for a new cheaper “first bid.”

---

## 7. First sponsorship minimum

A new listing amount is valid only when:

```text
amount_paise >= 49_900
amount_paise <= 2_147_483_600
amount_paise % 100 == 0
```

The V1 maximum is the largest whole-rupee value that fits Dodo Payments'
documented signed 32-bit minor-unit checkout amount. A later provider may use a
different transport ceiling, but changing this customer-facing limit requires a
new policy version and migration/test review.

The check runs in the client for convenience, on the server at attempt creation, and again under authoritative transaction/constraints before fulfilment.

---

## 8. Minimum later raise

For immutable original `O` paise:

```text
percentage_component = CEIL_TO_WHOLE_RUPEE(O × 10 / 100)
minimum_raise         = MAX(percentage_component, 100_000)
```

Integer implementation:

```text
CEIL_DIV(a, b) = (a + b - 1) DIV b
percentage_component_paise = CEIL_DIV(O, 1_000) × 100
minimum_raise_paise = MAX(percentage_component_paise, 100_000)
```

The percentage rounds **upward** to the next whole rupee.

| Original | Exact 10% | Rounded component | Minimum later raise |
| -------: | --------: | ----------------: | ------------------: |
|     ₹499 |    ₹49.90 |               ₹50 |          **₹1,000** |
|   ₹8,000 |      ₹800 |              ₹800 |          **₹1,000** |
|   ₹9,999 |   ₹999.90 |            ₹1,000 |          **₹1,000** |
|  ₹10,000 |    ₹1,000 |            ₹1,000 |          **₹1,000** |
|  ₹10,001 | ₹1,000.10 |            ₹1,001 |          **₹1,001** |
|  ₹15,000 |    ₹1,500 |            ₹1,500 |          **₹1,500** |
|  ₹25,000 |    ₹2,500 |            ₹2,500 |          **₹2,500** |
|  ₹25,005 | ₹2,500.50 |            ₹2,501 |          **₹2,501** |

A raise may be any larger whole-rupee amount. The server stores the policy version and minimum snapshot on the payment attempt.

---

## 9. Confirmed total and ledger

For listing `L`:

```text
confirmed_total_paise(L) = SUM(financial_ledger.amount_delta_paise WHERE listing_id = L)
```

Positive entries are confirmed first sponsorships/raises/restorations. Negative entries are effective refunds, chargebacks or authorised corrections.

`listings.confirmed_total_paise` is a transactionally maintained read projection. The immutable ledger is the underlying authority. Reconciliation must prove equality and total must never be negative.

Never overwrite total from browser input or provider order data. Never edit/delete a ledger row.

---

## 10. Main ranking

A listing is eligible only when:

```text
lifecycle_status == active
moderation_status == clear
confirmed_total_paise > 0
safe approved destination exists
```

Order exactly:

```sql
ORDER BY
  confirmed_total_paise DESC,
  current_total_reached_at ASC,
  id ASC
```

Rank is derived with this ordering. Do not store current rank as a writable field.

### Tie rule

If A reached ₹10,000 before B, B merely reaching ₹10,000 remains below A. B must reach ₹10,001 to pass.

`current_total_reached_at` is the database transaction time when GoneViral applies the latest positive or negative rank-affecting ledger delta. Provider timestamps are retained separately for history/reconciliation, but cannot backdate tie priority.

On every rank-affecting delta:

```text
current_total_reached_at = rank_applied_at
```

A reversal therefore gives the reduced current total a new reached time.

---

## 11. Takeover quotes

For listing current total `C`, target total `T` and listing minimum `M`:

```text
needed_to_exceed = T + 100 - C
required_payment = MAX(M, needed_to_exceed)
```

For a new listing use `C = 0` and `M = 49_900`.

Quotes are server-calculated, time-stamped and informational. They do not reserve rank or auto-increase the charge. The attempt stores target/total/rank snapshots. On confirmation, display the actual resulting rank.

Example:

```text
A total = ₹10,000
B total = ₹8,000
B minimum raise = ₹1,000
Needed to pass A = ₹2,001
Required payment = ₹2,001
```

If A moves before B confirms, B still receives the paid ₹2,001 cumulative sponsorship and ranks according to actual current totals.

---

## 12. Today leaderboard

Today is:

> **Net rank-affecting sponsorship applied during the current calendar day in `Asia/Kolkata`.**

It is not rolling 24 hours, clicks, percentage growth or “listings created today.”

For business date `D`:

```text
start = D 00:00:00 Asia/Kolkata
end   = D+1 00:00:00 Asia/Kolkata
```

Score:

```text
today_net_paise = SUM(ledger deltas whose applied_business_date == D)
```

- First sponsorships and raises applied today add.
- Refunds/chargebacks applied today subtract.
- A later-day refund does not rewrite a historical day; it affects its application day and Main immediately.
- Splitting one amount across payments gives no score advantage.

Eligibility: public-eligible listing and `today_net_paise > 0`.

Order:

```sql
ORDER BY today_net_paise DESC, today_total_reached_at ASC, listing_id ASC
```

Disclosure:

> **Confirmed sponsorship added today, net of reversals posted today. Resets at midnight IST.**

No historical Today archive in V1.

---

## 13. Categories

Launch categories:

1. People & Creators
2. Tech & Apps
3. Brands & D2C
4. B2B & Services
5. Media & Entertainment
6. Other

Rules:

- exactly one category per listing;
- category board is Main ordering filtered by category;
- no separate category total/ledger;
- selected before checkout;
- owner self-service category locks after first successful sponsorship;
- owner may request a change; admin approves/rejects with audit;
- category change does not alter money/timestamps;
- old/new category caches invalidate after approved change.

---

## 14. Listing identity, destination and duplicates

Public listing fields:

- name;
- short tagline;
- approved HTTPS destination;
- category;
- optional sanitized logo;
- stable slug.

No listing implies GoneViral endorsement/verification unless a future explicit verification product exists.

### Canonical destination uniqueness

Only one listing record may own a canonical destination identity, including removed listings. Removal cannot permit public hijacking.

Canonicalisation baseline:

- lowercase/punycode host;
- strip trailing dot, default port and fragment;
- normalise empty root path;
- retain meaningful path/query;
- recognise provider-specific canonical social handles only through explicit rules.

A duplicate submission:

- creates no second listing;
- shows existing public listing where eligible;
- offers enumeration-safe management recovery;
- never reveals owner email/match status.

### Slugs

Slugs are unique, stable, lower-case and collision-safe. Normal owner name edits do not change them. Admin slug changes require audit and redirect mapping.

---

## 15. Lifecycle and moderation axes

These states are independent.

### Lifecycle

```text
draft -> payment_pending -> active
payment_pending -> draft/expired workflow
active -> inactive_reversed when total becomes zero
inactive_reversed -> active after permitted confirmed raise
active/inactive_reversed -> removed by admin
```

### Moderation

```text
unreviewed -> clear
unreviewed -> pending_review -> clear/suspended
clear -> suspended -> clear
```

Public ranking requires active + clear + positive total.

- Browser return may show pending; it never activates.
- First confirmed payment sets financial activation; moderation may still hide it.
- Suspension/removal retains financial history.
- Full reversal sets `inactive_reversed` while preserving moderation status.
- Valid incoming provider events continue while suspended/removed.
- Owner cannot self-restore a removed listing.

---

## 16. Guest-first ownership

### First purchase

1. Customer submits listing, email and amount.
2. Server validates URL/content/rate/Turnstile and creates provisional listing + pending owner + payment attempt.
3. Hosted provider checkout opens.
4. Browser returns to a pending page.
5. Server waits for authoritative confirmation.
6. Transaction applies ledger/total/daily projection and financial lifecycle.
7. Customer receives confirmation and secure management magic link.

### Claim

- Supabase passwordless PKCE flow establishes session.
- Verified session email must match the pending canonical owner email.
- Claim creates owner relationship and marks pending claim complete.
- No raw owner-authorising listing secret is placed in URLs.
- Redirect targets are relative/allowlisted.
- Recovery is rate-limited, Turnstile-protected as needed and enumeration-safe.

### Management

Only a verified owner may raise, edit low-risk fields, request sensitive changes and view private payment history. Admin action is separately authorised/audited.

---

## 17. Payment authority and visible states

The following never add sponsorship:

- provider/browser success page;
- return query parameter;
- client SDK callback;
- payment screenshot/receipt;
- client polling result not backed by database state.

Only a signature-verified, semantically valid provider success applied by server transaction creates a positive ledger entry.

| Internal result                      | Customer message                  | Rank effect                |
| ------------------------------------ | --------------------------------- | -------------------------- |
| checkout not created                 | explain validation/provider error | none                       |
| pending/returned                     | confirming with provider          | none                       |
| failed/user dropped/expired          | not confirmed                     | none                       |
| valid success applied                | amount confirmed + actual rank    | positive once              |
| authentic but mismatched/quarantined | received; verification needed     | none until safe resolution |
| effective reversal                   | adjusted total/status             | negative delta             |

Pending page polls an access-controlled no-store status endpoint for up to roughly 60 seconds with bounded backoff, then offers later refresh/email. Webhook/reconciliation remains authoritative.

---

## 18. Duplicate, delayed and concurrent payments

- Same provider event delivered repeatedly: authenticate each; apply once; acknowledge known duplicate.
- Multiple provider payment attempts under one order: store each. First valid settled payment fulfils the internal attempt. A second genuine settled payment is `duplicate_paid`, quarantined and reviewed/refunded, not silently added/discarded.
- Two separate valid raise attempts that both settle: both count.
- Success can supersede an earlier failed/dropped/expired event. A later failure cannot regress success.
- Provider success arriving after local expiry is still applied if valid.
- Payment and refund arriving together serialize through listing row lock; final total is arithmetic sum.

---

## 19. Refunds, chargebacks and restorations

Never mutate the original positive ledger entry. Append signed adjustment entries.

```text
new_total = old_total + adjustment_delta
```

Rules:

- partial reversal reduces Main immediately after authoritative application;
- Today receives the delta on application date;
- positive remaining total remains eligible even if below ₹499;
- zero total becomes inactive reversed;
- original successful sponsorship remains unchanged;
- reversal resets current-total reached time;
- a restored chargeback/refund appends a positive restoration entry;
- aggregate reversals cannot exceed settled paid amount;
- refund request alone does not reduce rank; effective provider state does.

Subject to reviewed law/policy, rank loss, low traffic or lack of virality alone is not refundable. Duplicate charges, failure to deliver, provider-required adjustments and legal rights are handled.

---

## 20. Moderation

### Submission screening

V1 is automated by default, not manually pre-approved by default. Before checkout/activation, the server runs deterministic checks over name, tagline, canonical destination, category and sanitized logo state:

- explicit prohibited-word/claim and destination denylist checks;
- URL/canonical duplicate/safety checks;
- rate/velocity/Turnstile risk signals;
- provider/merchant-policy category checks;
- file sanitisation requirements.

A low-risk valid submission may move from `unreviewed` to `clear` automatically. A suspicious/ambiguous submission moves to `pending_review`; an explicit prohibited match is rejected or suspended according to whether payment already settled. No third-party AI moderation service is required in V1. Report/admin workflows provide the human backstop. Screening never changes the amount ledger.

Suspension:

- hides listing from Main/Today/categories/listing indexing and outbound redirect;
- preserves money, owner, provider and audit records;
- blocks new owner raises and risky edits;
- requires admin reason/audit;
- does not itself refund or alter total.

Removal is stronger delisting, still without deleting financial records.

Baseline prohibited content includes pornography/sexual services, illegal gambling, illegal drugs/weapons, malware/phishing, scams/impersonation, fraudulent investment claims, piracy/counterfeits, extremist/hate content, malicious redirects, illegal services and provider-prohibited categories.

Reports never automatically change rank solely by count.

---

## 21. Listing edits

Owner may directly edit after validation/audit:

- tagline;
- same-entity display-name correction within limits;
- sanitized logo;
- same-approved-host path/query where policy permits.

Review required:

- destination host/eTLD+1 change;
- category;
- material identity/name change;
- suspicious claims;
- changes to a reported/suspended listing.

Old safe value remains live during review. Owner/listing sale or transfer is not supported in V1; exceptional legal ownership changes are manual evidence-based admin actions.

---

## 22. URL rules

Production destination must:

- use `https:`;
- contain a valid registrable non-IP host;
- contain no credentials;
- not target localhost/private/link-local/reserved/internal addresses;
- use no dangerous/custom scheme;
- fit byte limit;
- parse/canonicalise deterministically;
- pass denylist/report/provider policy.

V1 never fetches/renders arbitrary destination URLs server-side. Public clicks use a first-party redirect by stored listing slug, re-checking eligibility/URL before a temporary redirect. No `/go?url=` open redirect.

---

## 23. Logo/image rules

- optional;
- JPEG, PNG or WebP input only;
- maximum 2 MiB;
- reject SVG, GIF/animation, document/archive and unknown formats;
- short-lived signed upload to private staging;
- verify magic bytes, decoded dimensions/pixel count;
- decode/re-encode with Sharp, stripping metadata/animation;
- random server-generated object key;
- publish sanitized output only;
- delete rejected/orphaned staging objects.

---

## 24. Clicks and public activity

Tracked outbound clicks are separate from rank. Label them accurately.

V1 counting:

- through the safe redirect route;
- suppress obvious bots/prefetch;
- at most once per listing per privacy-preserving keyed visitor HMAC per IST day;
- no raw IP retained solely for analytics;
- dedupe rows expire within eight days;
- aggregate daily.

Public activity may show joined/added amount/took rank with public-safe data. Never expose payer identity, email, provider/payment IDs, payment method or dispute details.

---

## 25. Sharing and victory

Celebrate only after ledger commit. Use actual post-commit rank.

Good:

- `₹5,000 confirmed. You’re now #3.`
- `Acme just took #1 on GoneViral.`
- `The board moved during confirmation. ₹2,001 was added; Acme is now #4.`

Share images include actual rank at generation time (or timestamped historical claim), listing identity, board context, sponsored-ranking label and GoneViral domain. No fake reach/views/urgency.

---

## 26. Disclosure and trust

Every board places sponsored disclosure above/adjacent to the list. Checkout shows:

- listing/destination;
- exact amount;
- cumulative nature;
- current estimate, not reservation;
- no traffic/virality guarantee;
- Terms, Privacy, refund/content policies;
- customer/invoice fields required by reviewed policy.

Distinguish sponsorship total, clicks, confirmed/pending and Today/Main.

---

## 27. Domain invariants

1. Listing confirmed total equals ledger sum.
2. Total is never negative.
3. All V1 deltas are whole-rupee paise integers.
4. Original sponsorship is null before first success and immutable thereafter.
5. At most one positive fulfilment per internal payment attempt.
6. Provider event/payment/adjustment IDs are unique within provider/environment.
7. Duplicate delivery creates no duplicate ledger entry.
8. Browser return cannot create ledger entry.
9. Raise amount meets attempt's policy snapshot.
10. Initial amount is at least ₹499.
11. Main/category use exact deterministic ordering.
12. Today uses IST application date and net delta.
13. Rank is derived, not writable.
14. Hidden listings retain financial history.
15. Reversals/restorations are immutable new entries.
16. Public readers cannot access owner/provider/admin/report data.
17. Owner manages only explicitly owned listing.
18. Category locks after first success except audited admin change.
19. Post-payment destination-host change requires review.
20. Sensitive admin action is audited.
21. Public cache contains public-safe projection only.
22. Provider success validates internal attempt, amount, currency and environment.
23. Distinct settled raises both count; concurrency loses no update.
24. Success never regresses to failed.
25. Promotional gateway pricing never alters product rules.

---

## 28. Required examples

### A — tie does not pass

```text
A ₹10,000 reached earlier; B ₹8,000.
B pays ₹2,000 -> both ₹10,000 -> A remains above B.
B needs ₹2,001 at that snapshot to pass.
```

### B — absolute floor

```text
Original ₹8,000 -> 10% ₹800 -> minimum raise ₹1,000.
```

### C — percentage wins

```text
Original ₹25,000 -> minimum raise ₹2,500.
```

### D — original never changes

```text
Original ₹25,000, current total ₹60,000 -> next minimum still ₹2,500, not ₹6,000.
```

### E — redirect is not settlement

```text
Browser returns success without applied provider confirmation -> pending; no rank change.
```

### F — duplicate webhook

```text
Same success delivered five times -> one positive ledger entry.
```

### G — concurrent raises

```text
Start ₹10,000; separate ₹2,000 and ₹3,000 raises both settle -> final ₹15,000.
```

### H — reversal resets tie time

```text
A old ₹20,000 refunded to ₹10,000 today; B has been ₹10,000 since yesterday.
B remains above A at tie because A reached current ₹10,000 only today.
```

### I — Today

```text
A +₹5,000 then -₹1,000 today = ₹4,000 Today.
B first sponsors ₹4,500 today = ₹4,500 Today.
Today: B then A. Main uses each current cumulative total.
```

### J — rounding

```text
Original ₹10,001 -> exact 10% ₹1,000.10 -> ceil ₹1,001 -> minimum ₹1,001.
```

---

## 29. Launch budget and infrastructure posture

Owner decision effective 2026-09-02:

- do not purchase or require Vercel Pro during private staging; make a separate
  owner decision on the commercial production host and plan immediately before
  live launch, including applicable cost controls and residual billing risk;
- Supabase Free is accepted with no managed PITR, weaker recovery guarantees,
  possible inactivity pause, dependence on GoneViral's encrypted logical and
  Storage backups, and potential recovery downtime;
- the existing certified backup/restore procedure remains required and must
  not be represented as managed provider recovery;
- Vercel Hobby may remain a private preview environment, but it cannot host the
  commercial payment launch under Vercel's published non-commercial terms;
- the public-repository audit passed, but GitHub Actions automatic scheduling
  is retired after both the guarded workflow and an isolated canary received no
  scheduled events; keep it disabled with no automatic trigger or enable guard;
- use one minimal Cloudflare Worker on Workers Free as the private-staging
  scheduler, with three UTC Cron Triggers, Cloudflare secrets for the route and
  protected-Preview credentials, fixed route mapping, and no application
  business logic;
- accept a five-minute email-outbox cadence and external scheduler delay,
  missed-run, or duplicate-delivery risk; durable idempotent workers must catch
  up safely on the next run;
- the owner's existing VPS is reserved for OTTR and is not a GoneViral runtime.

The detailed evidence, schedule requirements, public-repository gate, next
workstreams, and upgrade triggers are in
`../docs/PHASE_15_BUDGET_CONSTRAINED_LAUNCH_PLAN.md`. This is
an infrastructure/risk decision and does not change product policy version,
money semantics, provider authority, or any live-payment gate.

Owner decision effective 2026-09-04:

- Production remains on Vercel plus Supabase, with Cloudflare Workers Cron as
  the only automatic scheduler; Vercel Cron is not part of the final topology.
- Vercel Pro is required immediately before commercial Production because the
  published Hobby boundary is non-commercial. It is not required for staging.
- The owner confirms Dodo merchant/KYC/business/bank/live capability and the
  GoneViral brand are configured for this sponsored-listing model. A separate
  written model-approval artifact is not a gate unless Dodo requests it; the
  provider's live account status and merchant-acceptance policy remain ongoing
  conditions.
- The public policies are effective owner-drafted terms. External lawyer and CA
  review are optional risk reduction, not indefinite engineering gates. The
  owner accepts responsibility for current legal, GST, invoice, payout, and
  accounting treatment without representing professional approval.
- Production deployment/domain, live credentials, payments/refunds, cleanup,
  and Phase 16 retain their separate authorization boundaries.

---

## 30. Policy evolution

A future change must define a new policy version, in-flight attempt treatment, existing-listing effect, migration/rollback, public disclosure/Terms impact and full test updates. Never reinterpret historical attempts or rewrite immutable ledger history under a new rule.
