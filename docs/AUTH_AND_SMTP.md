# Owner authentication and email delivery

## Runtime boundary

GoneViral uses Supabase Auth passwordless email links with the PKCE flow. The
current `@supabase/ssr` clients keep the session in cookies and `src/proxy.ts`
refreshes expiring tokens. Proxy is not an authorization boundary: every owner
query joins the requested listing to an active `private.listing_owners` row for
the verified `auth.users.id`.

The first successful Dodo Payments sponsorship creates a pending owner record.
After Supabase verifies the email, one locked transaction matches the canonical
verified Auth email to that pending record and creates the active owner
relationship. Browser-supplied email, `user_metadata`, listing slug, URL
parameters, and payment return pages never grant ownership.

Dodo Payments remains the current payment provider behind the payment adapter.
Supabase Auth establishes identity only; it does not confirm money. Other
payment providers may be added or replace Dodo later by implementing the same
provider contract without changing this ownership rule.

## Hosted Supabase configuration

1. Set the production Site URL to `https://goneviral.in`.
2. Add exact callback URLs for production and approved preview hosts, ending in
   `/auth/callback`. Do not use a broad wildcard for production.
3. Keep email sign-up enabled because a first sponsor may not yet have an Auth
   user. The application sends a link only after a private association check and
   always returns the same public response.
4. Keep the magic-link expiry and resend interval within the documented
   Supabase policy, and verify both expired and replayed links in staging.
5. Configure production cookie/domain behavior only through the current
   Supabase SSR client. Do not create a parallel application session cookie.

## Resend custom SMTP gate

Production magic links require Supabase Auth custom SMTP backed by Resend. This
is separate from any Resend API integration used for application email.

Before enabling production access:

1. Verify a dedicated authentication sending domain in Resend.
2. Publish and verify SPF, DKIM, and DMARC records.
3. Configure the Resend SMTP host, port, username, password, sender address, and
   sender name in Supabase Auth settings. Never commit these values.
4. Use concise transactional templates with one management action and no
   sponsor-supplied content.
5. Configure production and approved preview callback URLs before sending.
6. Send a genuine staging magic link to an approved mailbox, confirm PKCE code
   exchange, confirm one-time replay rejection, and check delivery/bounce logs.
7. Record the human approver, test timestamp, environment, and redacted delivery
   evidence in the release checklist.

Local Auth and database tests do not prove SMTP delivery. Production credentials,
DNS verification, inbox delivery, and staging results must never be fabricated.

Supabase Auth SMTP is distinct from application notifications delivered through
the Resend API. Application messages only direct an owner to the generic manage
request page; Supabase creates the one-time link. Delivery worker, retry,
webhook, privacy, and operator procedures are documented in
[`TRANSACTIONAL_EMAIL_OPERATIONS.md`](./TRANSACTIONAL_EMAIL_OPERATIONS.md).
