# Moderation, reports and admin operations

Phase 10 adds a private founder console at `/admin` and a public report form at
`/l/[slug]/report`. The console is an operational interface over PostgreSQL
authority; it is not a shortcut around the financial ledger or provider-event
pipeline.

## Provider boundary

Dodo Payments is the current payment and refund provider. Dodo calls are kept
behind checkout, webhook, reconciliation and refund executor interfaces so an
additional provider can be introduced, or Dodo can be replaced, without
changing listing, ledger, ranking or moderation rules. Provider settlement
state remains external authority; GoneViral's append-only ledger remains domain
authority.

Provider refunds are disabled by default through the
`provider_refunds_enabled` database flag. Enabling the flag does not issue a
refund. An `operations` or `super_admin` must first prepare a bounded request
with evidence and then make a separate confirmation. The confirmation uses the
refund public ID as Dodo's idempotency key. A submitted request never edits the
ledger or rank: only a later authentic signed Dodo refund event can append the
effective negative delta. A refund for a payment that never funded the listing
applies no rank delta.

The local mock verifies the workflow without contacting Dodo. Dodo test mode
requires real test credentials and a refundable succeeded payment. No test or
production provider approval, credential, refund, or result is implied by the
local checks.

## Reports

Eligible public listing pages link to a report form with fixed abuse categories,
a detailed explanation and an optional reporter email. Submission requires the
`report` Turnstile action and is constrained by IP/listing rate buckets and a
24-hour fingerprint/category duplicate check. The response is deliberately
generic for missing, duplicated and rate-limited targets.

Reports are private signals only. Their count cannot suspend a listing, change
its total, enter Main/Today ranking, or create public activity. Reporter email
is encrypted at rest and its digest is used only for private correlation.

## Admin access and roles

Admin authorization is checked on the server against an active, non-revoked
row in `private.admin_users`. A verified Supabase user, an AAL2 MFA session and
a JWT issue time are required before queue data is read. Mutating actions also
require the AAL2 session to have been issued within 30 minutes. Admin responses
are marked `private, no-store`; client navigation or UI tampering grants no
access.

Roles are deliberately narrow:

- `reviewer`: view listing/report queues, clear/suspend/unsuspend, review
  ordinary change requests and enqueue a safe management-email resend;
- `operations`: reviewer access plus removal, canonical destination
  release/reassignment, payment identifiers and two-stage refund operations;
- `super_admin`: operations access plus emergency operational flags.

Initial admin enrollment is a human security ceremony: create and verify the
Supabase user, enroll a verified MFA factor, then insert its Auth UUID and
least-privilege role into `private.admin_users` through an approved direct
database session. Do not expose an in-app first-admin bootstrap or infer a role
from email/domain or client metadata. Revoke access by setting `is_active` false
and `revoked_at`, and invalidate the user's Supabase sessions.

## Actions and evidence

Every mutation requires a unique request ID and an internal reason. Eligibility
changes and their immutable audit event commit in one transaction. Duplicate
request IDs are no-ops.

- Suspend hides the listing from public board/detail reads and blocks new
  raises without changing money.
- Unsuspend is allowed only for an active listing with a positive confirmed
  total.
- Remove retains its listing identity, destination evidence and financial
  history; it does not release a destination automatically.
- Name, tagline, category and destination requests are approved or rejected
  from their current pending state. A conflicting destination can be released
  only by operations, only from an already removed listing, and only with an
  evidence-based reason.
- Safe resend enqueues only a management email. The Phase 12 worker owns actual
  delivery and retry behavior.

Audit and moderation rows reject update/delete mutations. Public and owner read
models do not select reports, internal reasons, audit rows or provider secrets.
Reviewer dashboard/detail queries redact provider object identifiers.

## Emergency flags

The database-backed controls are:

- `read_only`: blocks public reports and owner/listing mutations, including
  edits and logo upload/finalization;
- `payments_enabled`: blocks new sponsorship and raise checkout creation;
- `provider_refunds_enabled`: permits the two explicit refund stages and is
  false by default.

Incoming signed Dodo events and reconciliation remain available during
read-only/payment shutdown so already-settled external state can converge.
Flag changes are super-admin-only and append an audit event in the same
transaction.

## Incident workflow

1. Set payments off and/or read-only if scope is uncertain.
2. Preserve public attempt, provider object and listing public IDs; never ask
   for card data.
3. Inspect the quarantined event/payment/reconciliation chain in `/admin`.
4. Resolve listing eligibility through a reasoned moderation action. Never
   update a total directly.
5. For a genuine refund, prepare it, independently re-check evidence and
   amount, then confirm it once. Wait for the signed Dodo event before expecting
   a rank change.
6. Verify the immutable audit, provider event, ledger and projection chain.
7. Restore flags only after the failure mode is understood.

## Verification

Run:

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm test:database
pnpm build
pnpm test:e2e
pnpm db:migrations:verify
pnpm db:schema:verify
pnpm db:lint
pnpm db:advisors
```

Manual hosted verification still requires a Supabase admin user with MFA and,
for provider-contract coverage, Dodo test credentials and an approved test
business. Never fabricate those credentials, approvals, public actions or test
results.
