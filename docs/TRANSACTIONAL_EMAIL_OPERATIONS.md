# Transactional email operations

## Authority boundary

Transactional email is a notification side effect, never financial authority.
GoneViral commits sponsorships and adjustments only from authenticated Dodo
Payments server-to-server events into the immutable ledger. A successful,
failed, delayed, bounced, or missing email cannot activate a listing, change a
total, alter rank, grant ownership, or reverse money. Dodo Payments is the
current payment provider behind replaceable payment adapters; another provider
can be added or substituted later without changing this email boundary.

Supabase Auth separately owns one-time passwordless management links. The
application's management email sends owners to the generic `/manage` request
flow and never embeds an Auth token. Browser-supplied addresses and email
delivery events do not grant ownership.

## Delivery architecture

Financial and administrative transactions insert a versioned row into
`private.email_outbox` in the same database transaction as the authoritative
change. The provider call is made later and outside every financial or admin
transaction.

The authenticated `GET /api/cron/drain-email-outbox` worker:

1. locks at most 10 due rows with `FOR UPDATE SKIP LOCKED`;
2. atomically changes each row to `sending` and takes a ten-minute lease;
3. decrypts the recipient only inside the server worker;
4. validates and renders the recorded template version;
5. sends through the selected delivery adapter with
   `goneviral-email/<outbox UUID>` as the stable provider idempotency key;
6. records only a provider message ID and a safe error code.

Provider I/O happens after the claim transaction commits. Two workers therefore
cannot claim the same live row. A crashed worker's lease becomes eligible again.
The Resend idempotency key protects the logical message when the first response
is ambiguous. Resend documents a 24-hour idempotency-key lifetime, so an
ambiguous item older than that window must be inspected in the Resend dashboard
before an operator resumes it.

Retryable network, rate-limit, concurrent-idempotency, and server failures use
bounded backoff. The fifth failed attempt becomes `dead_letter`. Validation,
template, and non-retryable provider failures dead-letter immediately. Admins
with `safe_email:resend` permission and recent authentication can resume only a
failed row for which no provider message ID was accepted. Every resume is
reasoned and append-only audited. The control resets the existing logical row;
it does not manufacture a new idempotency identity.

## Template and privacy contract

Template version `2026-08-30-v2` covers:

- first sponsorship confirmation and safe claim prompt;
- confirmed raise;
- refund/chargeback adjustment or restoration;
- generic management-link prompt;
- moderation result;
- listing-change result;
- delayed payment verification.

Every application template uses the shared branded email frame in
`src/server/email/templates.ts`: a sanitized public GoneViral logo, one clear
heading, plain-language body copy, one primary action, and a quiet support and
financial-authority footer. The renderer temporarily accepts the earlier
`2026-08-29-v1` identifier so already-queued Phase 15 notifications do not
dead-letter during the visual upgrade; newly queued messages record v2.

All sponsor-controlled strings are schema-bounded and HTML-escaped. Subjects
strip control characters. URLs are built from the configured GoneViral origin
and fixed application paths. Emails contain only public listing/attempt support
references, never provider payment payloads, webhook bodies, API keys, ownership
tokens, raw internal database IDs, or logs of the decrypted recipient. The
recipient remains AES-GCM encrypted at rest in the outbox and provider webhook
events persist only event ID, provider message ID, type, and timestamps.

## Resend application-email configuration

Use a dedicated transactional sending subdomain and complete the current Resend
domain-verification flow before hosted delivery. Publish and verify Resend's
required SPF and DKIM records and the organisation's approved DMARC policy.
Keep API keys and webhook signing secrets only in server-side secret storage.

Required runtime variables:

```text
EMAIL_DELIVERY_MODE=resend
RESEND_API_KEY=<server secret>
RESEND_FROM_EMAIL=updates@verified.example
RESEND_REPLY_TO=support@verified.example
RESEND_WEBHOOK_SECRET=<server secret>
CRON_SECRET=<server secret>
```

`RESEND_REPLY_TO` is optional. Local and test environments use
`EMAIL_DELIVERY_MODE=mock`; the application rejects that mode in production.
The owner-selected Cloudflare Workers Cron scheduler will invoke this worker
every five minutes. Durable rows wait safely through a delayed or missed
schedule and the next run catches up without changing the worker/outbox
contract. Configuration, the disabled-by-default guard, manual setup, and
schedule certification are documented in
`CLOUDFLARE_SCHEDULED_OPERATIONS.md`. GitHub automatic scheduling is retired;
production hosting and any later scheduler change remain separate decisions.

Create a Resend webhook for `https://goneviral.in/api/webhooks/resend` and
subscribe to sent, delivered, delivery-delayed, bounced, complained, failed,
and suppressed events. The route verifies the exact raw request body with the
Standard Webhooks signature headers before recording anything. Event IDs are
idempotent. Terminal reputation outcomes can supersede delivered state; stale
lower-priority events cannot regress it.

Official references:

- Resend send-email API: https://resend.com/docs/api-reference/emails/send-email
- Resend idempotency: https://resend.com/docs/dashboard/emails/idempotency-keys
- Resend webhooks: https://resend.com/docs/dashboard/webhooks/introduction
- Resend webhook verification: https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests
- Resend domains: https://resend.com/docs/dashboard/domains/introduction

## Supabase Auth SMTP and redirects

Application email through the Resend API and Supabase Auth custom SMTP are two
separate configurations. Configure the verified Resend SMTP sender in the
hosted Supabase Auth settings, retain the exact production Site URL, and
allowlist only the required `/auth/callback` URLs for production and approved
previews. Auth templates should use Supabase's generated one-time link and must
not introduce a user-controlled absolute redirect. The application callback
allows only its relative management destinations.

See `docs/AUTH_AND_SMTP.md` for the claim and anti-enumeration boundary.

## Operator workflow

The admin dashboard lists retryable/dead-letter rows and delayed, bounced,
complained, failed, or suppressed provider outcomes. It exposes the outbox ID,
kind, safe error code, attempt count, delivery state, timestamp, and provider
message reference, but never the recipient or payload.

For an incident:

1. keep financial processing live unless the financial system itself is unsafe;
2. inspect the safe error code and provider message reference;
3. correct DNS, sender, quota, or provider configuration;
4. for ambiguous sends, confirm provider history before the 24-hour idempotency
   window expires and never resume a provider-accepted row;
5. resume only the affected unsent row with an evidence-based reason;
6. verify the append-only admin audit and subsequent delivery event;
7. use payments-off/read-only flags only for their documented operational
   purpose, not as an email workaround.

## Launch evidence gate

Local mock, database, concurrency, and signature tests do not prove hosted
delivery. Before launch, record redacted evidence for domain verification,
SPF/DKIM/DMARC, Resend API send and signed webhook receipt, Supabase Auth custom
SMTP, a genuine staging magic-link claim/replay test, bounce visibility, worker
scheduling, and the human approver. No production credentials, DNS state,
approval, public activity, inbox delivery, or staging test result may be
fabricated.
