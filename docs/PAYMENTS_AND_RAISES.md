# Payments and raises

## Provider boundary

Dodo Payments is the current payment provider. Hosted checkout creation and
signed webhook normalization sit behind internal provider interfaces so another
provider can be added or replace Dodo later without changing ranking, ownership,
or ledger rules. Supabase Auth identifies a verified owner; it never confirms a
payment. Browser returns, polling, and local mock pages also have no financial
authority.

Local development uses a deterministic Dodo-compatible mock. It exercises the
same signed webhook handler as the hosted integration. Production and Dodo test
mode still require real Dodo credentials, business configuration, webhook
registration, and approval; none are fabricated by this repository.

## Initial sponsorship

Public `Take #N` actions always create a new initial sponsorship. When a target
is selected, the server recalculates the current quote as the greater of the
initial floor and the amount required to exceed the target's current total by
exactly ₹1. A displayed quote is an estimate, not a reservation.

## Owner raises

Only a verified active owner may start a raise. The server calculates the
minimum from the listing's immutable original sponsorship:

`max(₹1,000, ceil(original sponsorship × 10%) to a whole rupee)`

An optional takeover quote is recalculated under a database lock as:

`max(minimum raise, target current total + ₹1 - listing current total)`

The payment attempt stores immutable purpose, owner, minimum, target, current
total, and estimated-rank snapshots. A later signed Dodo success revalidates the
raise intent under the listing row lock, writes one `raise` ledger entry, and
increments the confirmed total without changing the original sponsorship.
Concurrent distinct raises may both settle; repeated delivery of the same Dodo
payment remains exact-once. The confirmation page reports the resulting rank,
which may differ from the checkout estimate.
