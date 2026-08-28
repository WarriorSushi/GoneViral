# Financial adjustments and reconciliation

## Provider boundary

Dodo Payments is the current payment provider, not a permanent domain
dependency. Dodo payloads are authenticated and normalized at the edge; the
ledger application service consumes provider-neutral payment and adjustment
state. A later provider can be added or can replace Dodo by supplying the same
normalized identities, amounts, currency, timestamps, and desired effective
delta. Ranking and ownership code must not call a provider SDK.

The implemented mapping follows Dodo's current official webhook contracts:

- `refund.succeeded` desires a negative refund delta; `refund.failed` desires
  zero only when no effective refund was previously applied. A later failed
  observation never invents a restoration of an already effective refund.
- dispute opened, expired, accepted, challenged, and lost states desire a
  negative chargeback delta;
- dispute cancelled and won states desire zero and therefore append a positive
  restoration when a chargeback was applied;
- pending/review refunds are retained by the provider but are not rank-effective
  until Dodo reports an effective state.

References: [Dodo webhook event guide](https://docs.dodopayments.com/developer-resources/webhooks/intents/webhook-events-guide),
[refund payload](https://docs.dodopayments.com/developer-resources/webhooks/intents/refund),
and [dispute payload](https://docs.dodopayments.com/developer-resources/webhooks/intents/dispute).

## Immutable application model

`private.provider_adjustments` stores provider identity plus both
`desired_effective_delta` and `currently_applied_delta`. The amount appended to
the ledger is always their difference. Negative refund/chargeback entries and
positive restoration entries are new immutable rows; the original payment row
and original sponsorship never change.

Payment and adjustment work for one provider payment is serialized by a
transaction-scoped provider-payment identity lock, followed by row locks. This
also lets an adjustment arrive before the local payment projection: its identity
is stored, the event becomes a durable exception, and a later valid payment
success applies the pending delta through the normal service. Aggregate desired
reversals cannot exceed the fulfilled payment, an unfulfilled duplicate-paid
payment is not rank-effective, and no transition may produce a negative listing
total.

Every applied delta updates the listing total, financial lifecycle, and
`current_total_reached_at` using database application time. It updates the IST
application day's net total rather than rewriting provider-time history. A
remaining positive value stays active even below ₹499; zero becomes
`inactive_reversed` unless the listing is already removed. Owners receive a
private outbox notification and can see the immutable entry in payment history.

## Scheduled reconciliation

`GET /api/cron/reconcile-payments` requires `Authorization: Bearer $CRON_SECRET`
and runs hourly on Vercel. In Dodo `test_mode`, the source uses Dodo's paginated
Payments, Refunds, and Disputes APIs for a bounded 48-hour window. A missing
payment success is retrieved in full and passed to the same fulfilment service as
a webhook. In deterministic local `mock` mode no external provider is contacted;
projection audits still run.

Every execution creates a durable `private.reconciliation_runs` row. Projection
checks compare the immutable ledger with listing totals, daily totals, original
sponsorship, current reached time, and lifecycle. Differences create durable open
`private.reconciliation_items` and emit a structured server error containing the
run ID. Provider/API failures mark the run failed and are retried by the
scheduler; they never create fabricated financial success.

## Projection repair

The repair command is dry-run by default and requires a listing UUID and an
operational reason:

```powershell
pnpm db:repair-projections -- --listing <uuid> --reason "ticket or incident reason"
```

After reviewing the printed expected and actual state, apply the ledger-derived
repair explicitly:

```powershell
pnpm db:repair-projections -- --listing <uuid> --reason "approved incident reason" --apply
```

The command requires `DATABASE_DIRECT_URL`, locks exactly one listing, derives
all financial values from the append-only ledger, rebuilds its daily projection,
and records the before/after plan in reconciliation runs/items. It never edits or
deletes ledger rows. `--apply` is an operational action, not an admin refund
interface; Phase 10 owns reviewed admin workflows.

## Human and infrastructure gates

No Dodo test or production calls have been claimed without real credentials.
Hosted cron execution, alert routing, provider reconciliation against a real
Dodo test business, and legal/accounting/refund-policy approval remain human or
infrastructure gates. Production credentials and provider state must never be
fabricated.
