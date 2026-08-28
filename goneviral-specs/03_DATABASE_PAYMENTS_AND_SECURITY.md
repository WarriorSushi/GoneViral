# 03 — Database, Payments and Security

**Depends on:** `00`, `02`  
**Primary rule:** the provider proves external payment state; PostgreSQL's immutable ledger and transaction rules define GoneViral state

---

## 1. Financial design principles

1. Every rank-affecting amount is an immutable signed ledger entry.
2. A browser cannot create a ledger entry.
3. Provider webhooks/status are authenticated and semantically validated.
4. Every externally retryable object has an internal idempotency identity.
5. Concurrency is resolved by PostgreSQL constraints and row locks, not “check then update” application code.
6. Denormalised totals/daily scores are updated in the same transaction as ledger inserts.
7. External provider/email/cache calls never occur while database locks are held.
8. Suspensions/removals hide content but do not rewrite money.
9. Reconciliation detects and repairs projection drift without editing history.
10. Public data is an explicit projection; private/payment/admin data never leaks by default.

---

## 2. PostgreSQL conventions

### Schemas

```sql
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS private;
```

Keep application tables out of the exposed `public` schema. Revoke unnecessary grants from `PUBLIC`, `anon` and `authenticated`. Next.js uses a dedicated server database role with least required privileges.

### IDs

Use UUIDv7 where supported by selected PostgreSQL/extensions/application generation; otherwise cryptographically random UUID. Public IDs use separate random values or stable slugs.

### Time

- store instants as `timestamptz` in UTC;
- store Today key as `date` computed from database transaction/application timestamp in `Asia/Kolkata`;
- use database time (`transaction_timestamp()` or a single captured application timestamp) for authoritative application/tie time;
- retain provider event timestamps separately, never for tie priority.

### Money

- `bigint` paise;
- positive attempt amounts;
- signed ledger deltas;
- checks for whole rupees in V1;
- TypeScript driver values mapped to `bigint`/string, never `number`.

### Enumerations

Prefer PostgreSQL enums for very stable state axes or text columns with explicit checks. Migrations must account for enum evolution. The names below are logical values; Codex may implement text + checks for easier deployment.

### Metadata

Use structured `jsonb` only for provider snapshots/public-safe non-authoritative metadata. Do not hide core state/amount/ownership inside JSON.

---

## 3. Core schema

The definitions are logical. Codex must implement equivalent Drizzle schema plus SQL migrations/constraints/indexes.

### 3.1 `app.categories`

```text
id                       uuid PK
slug                     text UNIQUE NOT NULL
name                     text UNIQUE NOT NULL
sort_order               smallint UNIQUE NOT NULL
is_active                boolean NOT NULL default true
created_at               timestamptz NOT NULL
updated_at               timestamptz NOT NULL
```

Seed exactly the six locked V1 categories in a migration. Category IDs remain stable across environments where practical.

### 3.2 `app.listings`

```text
id                              uuid PK
public_id                       text UNIQUE NOT NULL     # random, not secret
slug                            text UNIQUE NOT NULL
name                            text NOT NULL
name_normalized                 text NOT NULL
tagline                         text NOT NULL
destination_url                 text NOT NULL
destination_canonical_key       text UNIQUE NOT NULL
destination_host                text NOT NULL
category_id                     uuid FK app.categories NOT NULL
logo_asset_id                   uuid nullable
lifecycle_status                text NOT NULL
moderation_status               text NOT NULL
confirmed_total_paise           bigint NOT NULL default 0
original_sponsorship_paise      bigint nullable
current_total_reached_at        timestamptz nullable
first_confirmed_at              timestamptz nullable
last_rank_change_at             timestamptz nullable
category_locked_at              timestamptz nullable
moderation_reason_code          text nullable
removed_at                      timestamptz nullable
created_at                      timestamptz NOT NULL
updated_at                      timestamptz NOT NULL
version                         bigint NOT NULL default 1
```

Checks:

```text
confirmed_total_paise >= 0
confirmed_total_paise % 100 = 0
original_sponsorship_paise IS NULL OR original_sponsorship_paise >= 49_900
original_sponsorship_paise IS NULL OR original_sponsorship_paise % 100 = 0
active lifecycle implies original sponsorship non-null and total > 0
inactive_reversed implies original sponsorship non-null and total = 0
original null implies total = 0 and no current_total_reached_at/first_confirmed_at
```

Do not make `removed` erase canonical destination uniqueness.

Indexes:

```text
(lifecycle_status, moderation_status, confirmed_total_paise DESC, current_total_reached_at ASC, id ASC)
(category_id, lifecycle_status, moderation_status, confirmed_total_paise DESC, current_total_reached_at ASC, id ASC)
(destination_host)
(created_at DESC)
```

A generated/partial index for public eligibility may be used after verifying PostgreSQL planner behaviour.

### 3.3 `private.pending_listing_owners`

```text
id                     uuid PK
listing_id             uuid UNIQUE FK app.listings NOT NULL
canonical_email        citext/text NOT NULL
encrypted_email        text nullable if field-level encryption chosen
email_hash              bytea/text NOT NULL
claim_state             text NOT NULL  # pending, claimed, superseded
created_from_attempt_id uuid nullable
claimed_by_user_id      uuid nullable
claimed_at              timestamptz nullable
created_at              timestamptz NOT NULL
updated_at              timestamptz NOT NULL
```

Keep email private. If application-level encryption is used, key management/rotation must be documented. Hash supports equality/dedupe; use keyed HMAC, not unsalted plain hash.

### 3.4 `private.listing_owners`

```text
listing_id       uuid FK app.listings NOT NULL
user_id          uuid NOT NULL          # auth.users id
role             text NOT NULL default owner
created_at       timestamptz NOT NULL
revoked_at       timestamptz nullable
created_by       uuid nullable
PRIMARY KEY (listing_id, user_id)
```

Partial uniqueness may enforce one active primary owner in V1. Ownership transfer is manual/admin-only.

### 3.5 `private.payment_attempts`

```text
id                              uuid PK
public_id                       text UNIQUE NOT NULL
application_idempotency_key     text NOT NULL
provider                        text NOT NULL
provider_environment            text NOT NULL
provider_order_id               text nullable
provider_checkout_session_id    text nullable
listing_id                      uuid FK app.listings NOT NULL
purpose                         text NOT NULL  # initial_sponsorship | raise
state                           text NOT NULL
amount_paise                    bigint NOT NULL
currency                        char(3) NOT NULL default INR
policy_version                  text NOT NULL
minimum_required_paise_snapshot bigint NOT NULL
target_listing_id_snapshot      uuid nullable
target_rank_snapshot            integer nullable
target_total_paise_snapshot     bigint nullable
listing_total_paise_snapshot    bigint NOT NULL
estimated_rank_snapshot         integer nullable
requested_by_user_id            uuid nullable
pending_owner_id                uuid nullable
provider_order_request_hash     text NOT NULL
checkout_expires_at             timestamptz NOT NULL
fulfilled_ledger_entry_id       uuid nullable
failure_code                    text nullable
quarantine_reason               text nullable
created_at                      timestamptz NOT NULL
provider_created_at             timestamptz nullable
succeeded_at                    timestamptz nullable
expired_at                      timestamptz nullable
updated_at                      timestamptz NOT NULL
```

Constraints:

```text
UNIQUE(provider, provider_environment, provider_order_id) WHERE provider_order_id IS NOT NULL
UNIQUE(provider_environment, application_idempotency_key)
amount_paise > 0 AND amount_paise % 100 = 0
currency = 'INR' for V1
minimum_required_paise_snapshot > 0
amount_paise >= minimum_required_paise_snapshot
initial purpose requires requested_by_user_id nullable/pending owner and original null at creation
raise purpose requires requested_by_user_id and listing ownership at creation
at most one fulfilled_ledger_entry_id
```

Attempt amount/purpose/listing/policy fields become immutable after creation. Provider session fields/state progress are mutable under controlled transitions.

Suggested state values:

```text
intent_created
provider_order_pending
checkout_ready
customer_returned
provider_pending
succeeded
failed
dropped
expired
quarantined
duplicate_paid
cancelled
```

Success is terminal for fulfilment and cannot regress. A provider success can supersede failed/dropped/expired.

Indexes:

```text
(listing_id, created_at DESC)
(state, created_at)
(provider, provider_environment, provider_order_id)
(requested_by_user_id, created_at DESC)
(checkout_expires_at) WHERE state IN pending-like states
```

### 3.6 `private.provider_events`

```text
id                       uuid PK
provider                 text NOT NULL
provider_environment     text NOT NULL
provider_event_id        text NOT NULL
provider_event_type      text NOT NULL
signature_status         text NOT NULL
raw_body_digest          text NOT NULL
raw_payload_encrypted    bytea/text nullable
provider_created_at      timestamptz nullable
received_at              timestamptz NOT NULL
processing_state         text NOT NULL
normalized_event_type    text nullable
payment_attempt_id       uuid nullable
provider_payment_id      text nullable
semantic_error_code      text nullable
processed_at             timestamptz nullable
last_error_code          text nullable
attempt_count            integer NOT NULL default 0
UNIQUE(provider, provider_environment, provider_event_id)
```

When a provider lacks stable event ID, derive a documented collision-resistant idempotency identity from provider payment/adjustment ID + event type/version/status, while retaining digest. Never use raw-body digest alone if provider can legitimately resend equivalent payload serialisations.

### 3.7 `private.provider_payments`

```text
id                       uuid PK
provider                 text NOT NULL
provider_environment     text NOT NULL
provider_payment_id      text NOT NULL
provider_order_id        text NOT NULL
payment_attempt_id       uuid nullable
amount_paise             bigint NOT NULL
currency                 char(3) NOT NULL
status                   text NOT NULL
payment_method_family    text nullable
provider_created_at      timestamptz nullable
provider_updated_at      timestamptz nullable
first_seen_at            timestamptz NOT NULL
last_seen_at             timestamptz NOT NULL
settled_at               timestamptz nullable
fulfilled_ledger_entry_id uuid nullable
raw_snapshot_encrypted   bytea/text nullable
UNIQUE(provider, provider_environment, provider_payment_id)
```

A provider order can have multiple payment rows. Never identify fulfilment solely by order-level success without a validated payment identity/status.

### 3.8 `private.provider_adjustments`

```text
id                          uuid PK
provider                    text NOT NULL
provider_environment        text NOT NULL
provider_adjustment_id      text NOT NULL
provider_payment_id         text NOT NULL
payment_attempt_id          uuid nullable
listing_id                  uuid nullable
kind                        text NOT NULL  # refund | chargeback | reversal | correction
status                      text NOT NULL
amount_paise                bigint NOT NULL
currency                    char(3) NOT NULL
desired_effective_delta     bigint NOT NULL
currently_applied_delta     bigint NOT NULL default 0
applies_to_ledger_entry_id  uuid nullable
rank_effect_eligible        boolean NOT NULL default false
provider_created_at         timestamptz nullable
provider_updated_at         timestamptz nullable
first_seen_at               timestamptz NOT NULL
last_seen_at                timestamptz NOT NULL
UNIQUE(provider, provider_environment, provider_adjustment_id)
```

`desired_effective_delta` is normally negative for effective refund/chargeback and zero if reversed/cancelled, allowing state transitions to be represented as delta-to-apply.

### 3.9 `private.financial_ledger`

```text
id                          uuid PK
listing_id                  uuid FK app.listings NOT NULL
entry_type                   text NOT NULL
amount_delta_paise          bigint NOT NULL
currency                     char(3) NOT NULL
payment_attempt_id           uuid nullable
provider_payment_id          text nullable
provider_adjustment_id       text nullable
reverses_ledger_entry_id     uuid nullable
policy_version               text NOT NULL
applied_at                   timestamptz NOT NULL
applied_business_date        date NOT NULL
provider_effective_at        timestamptz nullable
created_by_admin_user_id     uuid nullable
reason_code                  text nullable
source_key                   text UNIQUE NOT NULL
source_provider              text nullable
source_environment           text nullable
metadata                     jsonb NOT NULL default '{}'
created_at                   timestamptz NOT NULL
```

Entry types:

```text
initial_sponsorship
raise
refund
chargeback
refund_restoration
chargeback_restoration
admin_financial_correction  # tightly controlled, never used casually
```

Constraints:

```text
amount_delta_paise <> 0
amount_delta_paise % 100 = 0
currency = INR
positive initial/raise unique per payment_attempt_id
provider adjustment application unique per adjustment/version/effective transition identity
applied_business_date = (applied_at AT TIME ZONE 'Asia/Kolkata')::date
initial_sponsorship/raise positive
refund/chargeback negative
restoration positive
```

Recommended uniqueness:

```text
UNIQUE(payment_attempt_id) WHERE entry_type IN ('initial_sponsorship','raise')
UNIQUE(source_key); construct it from immutable internal/provider identities, never user text
```

Indexes:

```text
(listing_id, applied_at, id)
(listing_id, applied_business_date)
(payment_attempt_id)
(provider_payment_id)
(provider_adjustment_id)
(applied_business_date, applied_at)
```

Ledger rows are append-only. Database privileges/triggers should block UPDATE/DELETE except tightly controlled migration/incident role. Application role gets INSERT/SELECT only.

### 3.10 `app.listing_daily_totals`

```text
listing_id              uuid FK app.listings NOT NULL
business_date           date NOT NULL
net_amount_paise        bigint NOT NULL default 0
total_reached_at        timestamptz NOT NULL
last_ledger_entry_id    uuid NOT NULL
updated_at              timestamptz NOT NULL
PRIMARY KEY (listing_id, business_date)
```

Checks:

```text
net_amount_paise % 100 = 0
```

It may be zero/negative internally; public Today filters `> 0` and public eligibility. Every applied ledger delta updates this row in the same transaction. `total_reached_at` updates to the application time of every delta, matching tie semantics for current day score.

Index:

```text
(business_date, net_amount_paise DESC, total_reached_at ASC, listing_id ASC)
```

### 3.11 `app.listing_assets`

```text
id                  uuid PK
listing_id          uuid nullable FK app.listings
kind                text NOT NULL # logo
state               text NOT NULL # staged, processing, ready, rejected, orphaned
staging_bucket      text nullable
staging_object_key  text nullable UNIQUE
public_bucket       text nullable
public_object_key   text nullable UNIQUE
content_type        text nullable
byte_size           bigint nullable
width               integer nullable
height              integer nullable
sha256              text nullable
rejection_code      text nullable
created_at          timestamptz NOT NULL
processed_at        timestamptz nullable
expires_at          timestamptz nullable
```

Only ready/sanitized object keys enter public projections.

### 3.12 `private.listing_change_requests`

```text
id                  uuid PK
listing_id          uuid NOT NULL
requested_by_user_id uuid NOT NULL
change_type         text NOT NULL
old_value_encrypted/jsonb NOT NULL
proposed_value_encrypted/jsonb NOT NULL
state               text NOT NULL # pending, approved, rejected, cancelled
reviewed_by_admin_id uuid nullable
review_reason       text nullable
created_at          timestamptz NOT NULL
reviewed_at         timestamptz nullable
```

Only one pending request per listing/change type unless policy explicitly allows replacement.

### 3.13 `private.reports`

```text
id                    uuid PK
public_id             text UNIQUE NOT NULL
listing_id            uuid NOT NULL
reason_category       text NOT NULL
explanation            text NOT NULL
reporter_email_encrypted text nullable
reporter_email_hash   text nullable
request_fingerprint   text NOT NULL
state                 text NOT NULL
turnstile_result      text nullable
reviewed_by_admin_id  uuid nullable
created_at            timestamptz NOT NULL
reviewed_at           timestamptz nullable
```

Report count never triggers an automatic financial/ranking change.

### 3.14 `private.admin_users`

```text
user_id          uuid PK
role             text NOT NULL # reviewer, operations, super_admin
is_active        boolean NOT NULL
created_at       timestamptz NOT NULL
created_by       uuid nullable
revoked_at       timestamptz nullable
```

### 3.15 `private.moderation_actions`

```text
id                uuid PK
listing_id        uuid NOT NULL
action_type       text NOT NULL
from_status       text nullable
to_status         text nullable
reason_code       text NOT NULL
public_reason     text nullable
internal_note     text nullable
admin_user_id     uuid NOT NULL
created_at        timestamptz NOT NULL
```

Append-only.

### 3.16 `private.admin_audit_events`

```text
id                 uuid PK
actor_user_id      uuid NOT NULL
actor_role          text NOT NULL
action              text NOT NULL
target_type         text NOT NULL
target_id           uuid/text NOT NULL
request_id          text NOT NULL
reason              text nullable
before_snapshot     jsonb nullable
after_snapshot      jsonb nullable
ip_hmac              text nullable
user_agent_summary  text nullable
created_at           timestamptz NOT NULL
```

Redact secrets/raw provider payloads. Append-only and protected from ordinary admin deletion.

### 3.17 Click aggregation

`private.click_dedupe`:

```text
listing_id       uuid NOT NULL
business_date    date NOT NULL
visitor_hmac     text NOT NULL
created_at       timestamptz NOT NULL
expires_at       timestamptz NOT NULL
PRIMARY KEY (listing_id, business_date, visitor_hmac)
```

`app.listing_click_daily_totals`:

```text
listing_id       uuid NOT NULL
business_date    date NOT NULL
unique_clicks    bigint NOT NULL default 0
updated_at       timestamptz NOT NULL
PRIMARY KEY (listing_id, business_date)
```

Click tables never join into ranking calculations.

### 3.18 `private.email_outbox`

```text
id                 uuid PK
kind               text NOT NULL
recipient_encrypted text NOT NULL
recipient_hash     text NOT NULL
template_version   text NOT NULL
payload_encrypted/jsonb NOT NULL
idempotency_key    text UNIQUE NOT NULL
state              text NOT NULL
attempt_count      integer NOT NULL default 0
next_attempt_at    timestamptz NOT NULL
provider_message_id text nullable
last_error_code    text nullable
created_at         timestamptz NOT NULL
sent_at            timestamptz nullable
```

### 3.19 Rate limiting/operational flags

`private.rate_limit_buckets` may provide database-backed coarse limits where platform controls are insufficient:

```text
scope, subject_hmac, window_start, count, expires_at
UNIQUE(scope, subject_hmac, window_start)
```

`private.operational_flags`:

```text
key text PK
value jsonb NOT NULL
updated_by uuid nullable
updated_at timestamptz NOT NULL
```

Every financial-impacting flag change is audited.

### 3.20 Reconciliation

`private.reconciliation_runs`:

```text
id, provider, environment, kind, window_start, window_end,
state, started_at, completed_at, counts, error_summary
```

`private.reconciliation_items`:

```text
id, run_id, provider_object_type, provider_object_id,
payment_attempt_id, listing_id, discrepancy_type, expected, actual,
state, resolution, created_at, resolved_at, resolved_by
```

---

## 4. Database access model

### Automated submission screening

Before a listing is eligible, the server runs versioned deterministic checks for prohibited text/claims, URL/destination safety and denylists, duplicate identity, request velocity/Turnstile risk and sanitized asset readiness. Store screening version, result codes and timestamps in a private screening record or moderation metadata/audit. Low-risk submissions transition to `clear`; ambiguous ones to `pending_review`; explicit prohibited submissions reject before checkout when possible or become `suspended` after a settled payment. Screening has no authority to create/edit ledger entries. Do not silently outsource V1 correctness to an opaque AI moderation API.

### Public

Public pages query through Next.js server using explicit public projections. No browser key can read domain/payment tables directly.

Projection fields may include:

```text
listing public ID/slug/name/tagline/category/sanitized logo
confirmed total
current rank/tie time only as needed
Today net amount/rank
privacy-safe aggregate clicks
public activity labels/timestamps
```

Never include owner email/user ID, payment/provider IDs, ledger source data, report/admin notes or private destination review data.

### Owner

Every owner query/mutation includes a database predicate joining active `listing_owners` to `auth user id`. Route-level checks alone are insufficient.

### Admin

Every admin operation resolves current user and active admin role server-side. Sensitive operations insert audit in the same transaction as state change.

### Supabase RLS defence in depth

If any table/view is exposed through Data API:

- enable RLS;
- explicitly grant only required operations;
- combine role with ownership predicate;
- UPDATE policies need SELECT and both USING/WITH CHECK;
- use `security_invoker` views;
- never authorise from `user_metadata`;
- audit with Supabase advisors.

Preferred V1: no domain table is directly exposed, reducing policy surface.

---

## 5. Database invariants and enforcement

Use all three layers:

1. pure domain functions and Zod validation;
2. transactional application services;
3. database constraints/uniqueness/privileges.

Critical database assertions include:

```text
listing total >= 0
whole-rupee amounts
one positive ledger fulfilment per attempt
unique provider event/payment/adjustment identities per environment
immutable original sponsorship
immutable attempt amount/purpose/policy
append-only ledger/audit
valid category/lifecycle/moderation states
public-eligible state consistency
```

Where a CHECK cannot compare other rows, enforce with locked transaction and reconciliation tests. Avoid complex triggers that hide business logic unless they add a simple last-line invariant such as append-only protection.

---

## 6. Payment attempt state machine

### Allowed transitions

```text
intent_created -> provider_order_pending
provider_order_pending -> checkout_ready | quarantined
checkout_ready -> customer_returned | provider_pending | succeeded | failed | dropped | expired | quarantined
customer_returned -> provider_pending | succeeded | failed | dropped | expired | quarantined
provider_pending -> succeeded | failed | dropped | expired | quarantined
failed/dropped/expired -> succeeded | quarantined    # delayed authoritative success
succeeded -> succeeded                              # idempotent repeats only
quarantined -> succeeded/failed/manual resolution   # controlled resolution
```

Never transition `succeeded` back to failed/dropped/expired. A refund affects ledger/adjustment records, not the original attempt's successful fulfilment status.

### Local expiry

Expiry stops checkout reuse/active UI polling. It does not prove provider failure and does not block a later authentic success.

---

## 7. Initial payment attempt creation

Input:

```text
name, tagline, destination, category, optional staged logo,
email, amount_rupees, target snapshot, terms acceptance, Turnstile token
```

### Transaction A

1. Validate/normalise destination and canonical identity.
2. Check prohibited/reserved destinations and duplicate canonical key.
3. Insert draft listing or safely resume existing provisional listing through application idempotency.
4. Insert pending owner email record.
5. Validate amount ≥ ₹499, whole rupees.
6. Insert attempt with immutable snapshots, `intent_created` and unique idempotency key.
7. Commit.

Concurrency on same canonical destination is resolved by unique constraint. Losing request receives existing-listing/recovery response, not a duplicate record.

### Provider creation outside transaction

Use deterministic provider order ID such as an irreversible/public-safe encoding of attempt identity, not user-controlled text. Send exact amount/currency/customer contact/return metadata. Use provider idempotency mechanism.

### Transaction B

Lock attempt and store provider order/session/expiry if consistent. If another retry already stored equivalent order, return it. If conflicting provider identity appears, quarantine and alert.

---

## 8. Raise attempt creation

1. Require verified owner session and active ownership predicate.
2. Reject removed/suspended/non-raisable listing.
3. Read current original/total/rank data.
4. Calculate minimum from immutable original and optional target quote server-side.
5. Validate whole-rupee amount.
6. Insert immutable attempt with owner/listing/policy snapshots.
7. Create provider checkout outside transaction as above.

The final webhook revalidates critical conditions under lock. It does not reject merely because the board/total changed; it rejects/quarantines only if the paid amount was invalid for the attempt's immutable policy snapshot or listing identity/state has a safety/legal block requiring manual handling.

---

## 9. Successful payment fulfilment transaction

Webhook signature verification and normalisation happen before this transaction. The transaction must be short and contain no external network call.

Use `READ COMMITTED` with explicit locks/unique constraints; retry boundedly on serialization/deadlock errors.

### Algorithm

```text
BEGIN;

1. INSERT provider_event ON CONFLICT DO NOTHING / lock existing event.
   - If previously processed to a durable terminal result: return duplicate result.
   - If same provider_event_id has different digest/core identity: quarantine collision.

2. UPSERT provider_payment by provider+environment+payment_id.
   - Preserve first-seen data; update monotonic current provider status/snapshot.

3. SELECT payment_attempt FOR UPDATE using trusted provider order mapping.
   - If absent: record authentic orphan/quarantine; COMMIT.

4. Validate:
   - provider and environment match;
   - order ID matches attempt;
   - payment amount exactly equals attempt amount;
   - currency exactly INR;
   - normalized event is authoritative success;
   - provider payment ID/status valid;
   - attempt request/order hash/metadata correlation valid where available.

5. If attempt already succeeded:
   - if same provider payment/ledger fulfilment: mark duplicate event processed; COMMIT no-op.
   - if a different genuine settled provider payment exists for same attempt/order:
     mark provider payment + attempt/work item duplicate_paid/quarantined;
     do not create another sponsorship ledger entry;
     COMMIT and alert/refund review.

6. SELECT listing FOR UPDATE.

7. Validate attempt purpose and locked listing facts:
   INITIAL:
     - attempt amount >= initial snapshot/minimum;
     - original_sponsorship_paise is null, unless this exact attempt already fulfilled;
     - destination/listing relationship unchanged.
   RAISE:
     - original exists;
     - amount >= attempt minimum snapshot;
     - requested owner was authorised when the attempt was created.
     - A listing becoming suspended/removed after checkout creation does not erase a genuine settled payment: apply it financially, keep the listing hidden and create an operations/refund review item when policy requires. New attempts are blocked while hidden.

8. Capture rank_applied_at = transaction_timestamp();
   business_date = (rank_applied_at AT TIME ZONE 'Asia/Kolkata')::date.

9. INSERT financial_ledger positive entry with unique payment_attempt_id.

10. UPDATE listing atomically:
    confirmed_total_paise += amount;
    current_total_reached_at = rank_applied_at;
    last_rank_change_at = rank_applied_at;
    original_sponsorship_paise = amount only if null and purpose initial;
    first_confirmed_at = rank_applied_at only if null;
    category_locked_at = first confirmation when null;
    lifecycle_status = active when moderation/state permits financial activation;
    version += 1.

11. UPSERT listing_daily_totals:
    net_amount_paise += amount;
    total_reached_at = rank_applied_at;
    last_ledger_entry_id = new ledger id.

12. UPDATE payment_attempt = succeeded with ledger link/time.
    UPDATE provider_payment = succeeded/settled mapped to attempt.
    UPDATE provider_event = processed.

13. INSERT email_outbox rows with idempotency keys.
    INSERT public-safe movement/event projection if implemented.

14. COMMIT.
```

After commit:

- invalidate public tags;
- schedule/drain email outbox;
- emit telemetry;
- return webhook acknowledgment.

### Important lifecycle nuance

If a first payment is financially valid but moderation is not yet `clear`, set lifecycle financially active while public eligibility remains false due moderation axis. Do not conflate “payment confirmed” with “publicly approved.” The owner UI must explain it.

---

## 10. Refund/chargeback/restoration transaction

Provider adjustment state may evolve. Do not create duplicate negative deltas every time an “effective refund” event repeats.

### Desired/applied delta model

For each provider adjustment whose source provider payment created a positive GoneViral ledger entry:

```text
desired_effective_delta =
  -amount for effective refund/chargeback
   0      for cancelled/reversed adjustment

amount_to_apply = desired_effective_delta - currently_applied_delta
```

If the source provider payment never fulfilled a sponsorship (for example a quarantined second charge under one order), set `rank_effect_eligible=false`, retain the adjustment for settlement/customer operations and apply **zero** ledger delta. Refunding an unfulfilled duplicate charge must not reduce the legitimate listing total.

Examples for a rank-effect-eligible payment:

```text
new refund: desired -100000, applied 0 -> apply -100000
repeat: desired -100000, applied -100000 -> apply 0
refund reversed: desired 0, applied -100000 -> apply +100000
```

### Transaction

1. Idempotently record/lock provider event.
2. Upsert and lock provider adjustment.
3. Resolve provider payment -> fulfilled attempt -> listing.
4. Lock payment/attempt/listing in consistent order.
5. Validate currency, adjustment amount and aggregate limits. Determine whether the referenced provider payment has `fulfilled_ledger_entry_id`; only then may the adjustment affect rank.
6. For an unfulfilled duplicate/quarantined payment, record/update the provider adjustment with zero rank delta, mark for refund/customer operations and commit. Otherwise calculate delta-to-apply.
7. If delta-to-apply is zero, mark event processed and commit.
8. Ensure `listing.confirmed_total + delta >= 0`.
9. Append appropriate negative/positive ledger entry with unique adjustment transition key.
10. Update listing total and `current_total_reached_at` to application time.
11. If total becomes zero, lifecycle -> inactive_reversed; if restored above zero and not removed, lifecycle -> active.
12. Update Today daily projection by delta on application business date.
13. Update adjustment `currently_applied_delta` and states.
14. Insert outbox/audit/operational records.
15. Commit; invalidate/send after commit.

### Aggregate bounds

For a provider payment, effective net negative adjustments may not exceed its settled positive amount. If provider reports an impossible/unknown relationship, quarantine and reconcile rather than driving listing total negative.

### Admin refund initiation

Admin initiating a provider refund is a request, not immediate rank reduction. Store audited refund request, call provider outside lock, and only apply negative ledger when provider status becomes effective. Two-stage confirmation and reason required.

---

## 11. Concurrency and locking

### Lock order

Use consistent order to reduce deadlocks:

```text
provider event/payment/adjustment identity
-> payment attempt
-> listing
-> daily total row
```

For operations spanning two listings (rare, e.g. canonical reassignment), lock UUIDs in sorted order.

### Why `READ COMMITTED` is sufficient

- row lock serializes updates to a listing total;
- unique constraints enforce one fulfilment per attempt/event;
- all values used for mutation are re-read under lock;
- ranking itself is derived after commit and need not lock the entire board.

Use bounded retry for deadlock/serialization codes with jitter; do not retry semantic mismatches.

### Two valid concurrent raises

Both attempt rows are distinct. Each success transaction locks the listing sequentially and increments from the latest total. Final total is sum of both; each gets its own application time. No lost update.

### Concurrent takeover quote

Quote has no lock/reservation. It may become stale; paid amount still adds. This is product behaviour, not a race bug.

---

## 12. Provider semantic validation

Signature validity alone is insufficient. Before fulfilment validate:

- provider/environment;
- event type/status;
- provider event/payment/order identifiers;
- internal order mapping;
- exact amount and currency;
- payment belongs to expected order/customer context where reliable;
- success is final/authoritative under provider docs;
- not test/sandbox in production;
- not already used to fulfil another attempt;
- timestamp/replay window as provider requires, without rejecting valid delayed retries after durable identity checks.

Unknown authentic events are stored/quarantined and alerted. Never map an unrecognised future event to success by default.

---

## 13. Idempotency matrix

| Operation             | Key                                                           | Guarantee                          |
| --------------------- | ------------------------------------------------------------- | ---------------------------------- |
| Browser create intent | application idempotency key + actor/draft scope               | one immutable attempt              |
| Provider order create | deterministic provider order ID/provider idempotency key      | retrieve/resume same order         |
| Webhook event         | provider + environment + event ID                             | record/process once                |
| Provider payment      | provider + environment + payment ID                           | one canonical payment row          |
| Positive fulfilment   | unique payment attempt ID                                     | one sponsorship entry              |
| Adjustment            | provider + environment + adjustment ID + effective transition | exact net delta once               |
| Email                 | domain event/template idempotency key                         | no duplicate transactional message |
| Admin action          | request ID + action scope where retryable                     | no duplicate destructive mutation  |
| Click                 | listing + business date + visitor HMAC                        | at most one unique count/day       |

A duplicate request returns the original safe result, not a generic error where possible.

---

## 14. Reconciliation

Webhooks are acceleration, not the sole source of truth. Run at least daily in production, more frequently for pending/exception states.

### Reconcile provider payments

For a bounded time window:

- provider succeeded but no GoneViral succeeded attempt/ledger;
- GoneViral succeeded but provider not settled/reversed;
- amount/currency/order mismatch;
- multiple settled payments for one order;
- pending beyond expected duration;
- orphan provider payment/order.

### Reconcile adjustments

- effective provider refund/chargeback not applied;
- applied adjustment whose provider state reversed;
- aggregate reversal exceeds payment;
- unknown adjustment/payment link.

### Reconcile database projections

```sql
ledger sum by listing == listings.confirmed_total_paise
ledger sum by listing/business_date == listing_daily_totals.net_amount_paise
first positive entry == original_sponsorship_paise
positive fulfilment uniqueness
active/inactive lifecycle consistency
```

### Repair hierarchy

1. If immutable ledger/provider evidence is correct but projection is wrong: repair projection in audited transaction.
2. If provider state is authoritative and ledger delta missing: apply through the same idempotent fulfilment/adjustment service, never direct total update.
3. If evidence conflicts/uncertain: quarantine, disable risky action if needed, create incident; do not guess.
4. Never edit/delete historical ledger to “make totals match.”

Every run and discrepancy is recorded. Critical mismatches alert immediately.

---

## 15. Ranking queries

### Main

Use eligible filter and deterministic window rank:

```sql
SELECT
  l.*,
  row_number() OVER (
    ORDER BY l.confirmed_total_paise DESC,
             l.current_total_reached_at ASC,
             l.id ASC
  ) AS rank
FROM app.listings l
WHERE l.lifecycle_status = 'active'
  AND l.moderation_status = 'clear'
  AND l.confirmed_total_paise > 0
ORDER BY l.confirmed_total_paise DESC,
         l.current_total_reached_at ASC,
         l.id ASC
LIMIT $1 OFFSET $2;
```

For top N, calculate rank before filtering/search transforms. Use keyset pagination when board becomes large:

```text
(last_total, last_reached_at, last_id)
```

### Category

Same query + category predicate. Same total/tie semantics.

### Today

Join daily projection for exact business date, filter positive and listing eligibility, order daily amount/reached time/listing ID.

### Estimated rank

Quote endpoint calculates hypothetical `new_total = current_total + amount`, comparing against current eligible rows with same tie semantics. It is labelled an estimate and not used for fulfilment.

---

## 16. URL security

### Parser/canonicaliser

Implement with platform URL parser and explicit allow/deny rules. Reject:

- scheme other than HTTPS;
- username/password;
- IP literal;
- localhost/single-label/internal host;
- non-ASCII ambiguity not safely punycoded;
- excessive length/control chars;
- reserved/private/link-local/multicast ranges represented by host/IP forms;
- known dangerous shorteners/redirect chains where policy blocks them;
- malformed ports.

Because V1 does not fetch destination, DNS rebinding is not directly exploitable through a crawler. Still reject obvious internal targets and re-check stored URL before redirect.

### Canonical uniqueness

Canonical identity logic must be unit-tested. Do not over-normalise meaningful path/query for products such as social profiles. Provider-specific social canonicalisation is an explicit rules table, not heuristic magic.

### Redirect

- lookup by stored slug;
- eligibility check;
- no arbitrary `url` parameter;
- use temporary redirect;
- add safe referrer/security headers;
- block suspended/removed destinations;
- log only public ID/host class, not secret query strings.

---

## 17. Upload security

Threats: polyglot files, decompression bombs, SVG scripts, metadata privacy, malicious dimensions, public staging, path manipulation.

Controls:

- signed private staging upload bound to actor/draft/listing;
- declared size/type checked before upload and actual bytes after;
- cap body/object size and decoded pixel count/dimensions;
- magic-byte detection and full decode;
- reject animation/multiple frames;
- re-encode to safe JPEG/PNG/WebP using Sharp;
- strip EXIF/ICC/text metadata unless required;
- server-generated keys, no original filename;
- output served with correct fixed content type, immutable caching and no user HTML;
- cleanup staging/rejected/orphaned assets;
- rate limits and malware scanner only if measured/provider policy requires beyond image decode.

Never accept SVG in V1.

---

## 18. Authentication and authorisation threats

### IDOR/BOLA

Every owner mutation query includes `listing_id` + active owner `user_id`. Do not accept owner email/listing public ID as proof.

### Magic-link abuse/enumeration

- generic response;
- rate limit by IP/email HMAC/device signals;
- Turnstile after threshold;
- short expiry, one-time provider semantics;
- safe relative redirects;
- log alert patterns without storing plain email in rate keys.

### Session security

- secure, HttpOnly, SameSite cookies through current Supabase SSR pattern;
- validate user/claims server-side;
- sign out/revoke sessions on ownership/admin compromise;
- do not authorise from editable metadata;
- short admin sessions/re-auth for destructive action;
- CSRF/origin protection for cookie-authenticated mutations.

### Admin compromise

- explicit DB allowlist/role;
- MFA/re-auth;
- least privilege;
- append-only audit;
- two-stage refund/remove/reassign actions;
- alerts for role/financial/operational flag changes;
- never expose admin endpoints in client-only guards.

---

## 19. Web application security

### XSS

- React escapes text; do not use `dangerouslySetInnerHTML` for user content;
- no Markdown/HTML listing fields in V1;
- sanitize/re-encode logos;
- validate URL schemes;
- restrictive CSP compatible with provider/Supabase/Turnstile/Sentry requirements;
- escape data in email/share image generation.

### SQL injection

- Drizzle/query parameters only;
- no user data in `sql.raw`/identifier strings;
- allowlist sort/filter/category keys;
- database role least privilege.

### CSRF

- Server Actions/current Next same-origin protections where used;
- validate Origin/Content-Type/CSRF token for route mutations as appropriate;
- SameSite cookies;
- webhook uses provider signature, not session/CSRF.

### Open redirect

- only relative internal `next` values;
- outbound route resolves stored approved URL by slug;
- no arbitrary redirect query parameter.

### SSRF

- do not fetch arbitrary destination in V1;
- provider API hosts are fixed official endpoints;
- storage fetch only trusted bucket/key;
- block private destinations even for redirects.

### Security headers

At minimum evaluate:

```text
Content-Security-Policy
Strict-Transport-Security
X-Content-Type-Options: nosniff
Referrer-Policy
Permissions-Policy
frame-ancestors via CSP
Cross-Origin-Opener/Resource policies as compatible
```

CSP must be tested with hosted checkout, Turnstile, Supabase Auth and Sentry. Do not weaken to broad `*`/unsafe directives without documented need.

---

## 20. Abuse and rate limits

Use layered controls: Vercel/platform protection, application limits, Turnstile and admin review.

Initial scopes (numbers tuned after testing, not hard product law):

- listing/checkout attempts per IP/device/email/destination;
- provider order retries per attempt;
- magic-link requests per IP/email;
- report submissions per IP/listing;
- upload intents/finalisations per actor/draft;
- status polling per attempt/IP;
- admin failed auth/actions;
- outbound redirect abuse/bots.

Rate-limit response is explicit `429` with safe retry guidance. Do not allow abuse counter to reveal email/listing ownership. High-value/velocity anomalies can enter pending review/quarantine rather than silent rejection.

---

## 21. Turnstile

- Verify token server-side with secret and expected hostname/action.
- Tokens are single-use/short-lived; verification is mandatory before protected operation.
- Bind expected action (`sponsor_create`, `magic_link`, `report`, etc.).
- Treat verification failure/timeout as failed; do not trust client success callback.
- Store only minimal result/error codes, not unnecessary token data.
- Test Cloudflare documented idempotency/retry behaviour.

Turnstile reduces automated abuse; it does not replace validation/rate limits/auth.

---

## 22. Privacy and data minimisation

Classify data:

### Public

Listing identity, category, approved destination, sanitized logo, sponsored totals/ranks, public activity and privacy-safe aggregate clicks.

### Confidential

Email, user IDs, invoices/contact, reports, request fingerprints, provider/payment IDs, internal moderation notes.

### Highly restricted

Provider secrets, webhook signature material, raw provider payloads, auth/service-role/database credentials, encrypted-field keys.

Practices:

- collect only required checkout/legal/provider fields;
- encrypt particularly sensitive stored payload/contact fields where practical;
- keyed HMAC for equality/rate/dedupe identities;
- scrub logs/Sentry/analytics;
- define retention/deletion schedule with counsel/accounting obligations;
- financial/audit records may need longer lawful retention than profile/contact data;
- data subject request process must preserve required legal records while deleting/anonymising non-required data;
- do not expose payer identity publicly.

---

## 23. Logging and telemetry rules

Log structured events such as:

```text
payment_attempt_created
provider_order_created
webhook_authenticated
webhook_duplicate
payment_fulfilled
payment_quarantined
adjustment_applied
projection_mismatch
reconciliation_completed
listing_suspended
admin_action
email_outbox_failed
```

Include correlation IDs and safe status codes. Never log:

- secret keys/tokens;
- full raw webhook body in normal logs;
- full email/plain IP;
- card/payment instrument data;
- magic-link URLs/OTPs;
- destination query strings where sensitive;
- private report/admin notes.

Set Sentry `beforeSend`/PII scrubbing and restrict access/retention.

---

## 24. Payment/provider compliance gate

Before live mode:

- describe product truthfully to provider as paid digital sponsored advertising placement;
- disclose public cumulative paid ranking and variable position;
- disclose no prize/payout/wager/wallet;
- obtain written approval/merchant category fit;
- complete KYC/entity/bank/domain/content/Terms/Privacy/refund review;
- configure production webhook endpoint/secrets/IP guidance if any;
- verify current signed-webhook algorithm against official docs;
- exercise sandbox then controlled live low-value test;
- document settlement/refund/chargeback/reconciliation APIs.

If provider declines, do not relabel/deceive. Implement another provider through the adapter only after equivalent approval.

---

## 25. Financial/admin permissions

Suggested roles:

| Action                      | Reviewer |                Operations |                 Super admin |
| --------------------------- | -------: | ------------------------: | --------------------------: |
| View listings/reports       |      yes |                       yes |                         yes |
| Clear/suspend               |      yes |                       yes |                         yes |
| Remove/reassign destination |       no |     yes with confirmation |                         yes |
| View payment references     |  limited |                       yes |                         yes |
| Initiate refund             |       no | yes with two-stage policy |                         yes |
| Manual ledger correction    |       no |             no by default | emergency only, dual review |
| Manage admin roles/flags    |       no |                        no |                         yes |

Manual ledger correction should be almost never used. Prefer provider-backed adjustment or projection repair. Any emergency correction requires incident ID, reason, before/after, second reviewer where possible, and immutable audit.

---

## 26. Migration strategy

- Drizzle schema is declarative source; committed SQL migrations are reviewed source of truth for production changes.
- Use direct database URL and migration role.
- Each migration is forward-only, transactional where PostgreSQL permits, with explicit rollback/repair plan.
- Add constraints `NOT VALID` then validate where large-table locking matters in future.
- Index concurrently only through safe non-transaction migration procedure if table size requires it.
- Never rewrite/delete financial history in migration.
- Backfills are idempotent scripts with checkpoints/dry-run and verification.
- Run Supabase database/security advisors before release.
- Take/verify backup before high-risk production migration.

Initial migration order:

1. schemas/extensions/roles/grants;
2. categories/listings/assets;
3. owners/auth relationships;
4. attempts/provider/event/payment/adjustment;
5. ledger/daily projections/constraints;
6. moderation/reports/audit;
7. clicks/email/rate/reconciliation;
8. indexes/append-only protections/seeds.

---

## 27. Seed data policy

- Seed categories and an initial admin only through secure environment-specific script.
- Local/test may seed clearly synthetic fixtures.
- Production must not seed fake listings/payments/clicks/activity/testimonials.
- Live smoke-test listing/payment must be clearly founder-owned and handled according to accounting/refund policy; do not fabricate it via database insert.

---

## 28. Required database/payment tests

### Money/policy

- initial ₹498 rejects; ₹499 accepts;
- original ₹10,001 -> minimum ₹1,001;
- custom amount whole rupee only;
- no bigint-to-number precision loss.

### Ranking

- totals descending;
- equal total earlier time wins;
- ID deterministic final tie;
- reversal resets reached time;
- category filter same ordering;
- Today IST boundary/net delta.

### Idempotency

- duplicate create request returns same attempt;
- repeated webhook creates one ledger row;
- same payment under different event IDs still one fulfilment;
- second genuine provider payment under one attempt quarantines;
- repeated refund event applies once;
- refund reversal restores once.

### Concurrency

- two raises both apply;
- simultaneous first success cannot set original twice;
- payment/refund order produces arithmetic result;
- duplicate destination submissions yield one listing;
- no deadlock under standard lock order.

### Security

- non-owner IDOR blocked;
- non-admin blocked server-side;
- raw return status cannot fulfil;
- invalid signature rejected;
- valid signature wrong amount/currency/order quarantined;
- open redirect/private URL/SVG/polyglot upload blocked;
- public cache/projection lacks private fields;
- ledger/audit update/delete denied.

### Reconciliation

- missing projection repaired from ledger;
- missing ledger from confirmed provider applies through service;
- irreconcilable mismatch quarantines, never guesses;
- daily projection rebuilt exactly.

---

## 29. Security launch checklist

- [ ] Provider written approval and live credentials.
- [ ] Exact webhook signature docs implemented with raw body tests.
- [ ] Production/staging secrets isolated and rotated from development.
- [ ] Domain tables private; grants/RLS/advisors reviewed.
- [ ] Owner/admin authorisation tested for IDOR/BOLA.
- [ ] CSP/security headers tested end-to-end.
- [ ] Turnstile server verification and rate limits active.
- [ ] Logo staging/sanitisation/cleanup verified.
- [ ] Redirect cannot accept arbitrary URL and blocks hidden listings.
- [ ] Logs/Sentry/analytics PII scrubbing verified.
- [ ] Ledger/audit append-only permissions verified.
- [ ] Duplicate/concurrent/delayed payment test suite passes.
- [ ] Reconciliation and financial mismatch alerting pass.
- [ ] Backup restore rehearsal complete.
- [ ] Admin MFA/re-auth/role/audit controls active.
- [ ] Counsel/CA-reviewed legal/privacy/refund/invoice requirements implemented.

---

## 30. Acceptance criteria

This design is complete only when:

- every positive/negative rank change has exactly one immutable ledger source;
- total and daily projections update atomically with the ledger;
- provider retries/out-of-order events are monotonic/idempotent;
- two legitimate concurrent raises cannot lose money;
- browser redirect/client callback cannot change rank;
- refund/chargeback/restoration changes rank exactly once;
- full reversal preserves original and history;
- public/owner/admin boundaries are enforced at query/mutation level;
- destination/upload/open-redirect/SSRF classes are addressed;
- all exceptions are durable, visible to operations and reconcilable;
- no code path directly “sets total” from provider/browser input.
