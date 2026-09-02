# Logos and owner edits

## Safe logo boundary

Logos are optional. An authenticated active owner declares a JPEG, PNG or WebP
and its browser-observed size. The server enforces the 2 MiB input limit,
rate-limits intents, creates the database asset, and generates the random object
key. It then obtains a path-bound Supabase signed-upload token for the private
`goneviral-logo-staging` bucket. The browser cannot supply a bucket, object key,
listing ID, or owner ID.

The application finalisation token is HMAC-signed, bound to the asset and owner,
and expires after ten minutes. Finalisation rechecks active ownership and the
database path, downloads only that private object, and validates actual length,
magic bytes, MIME agreement, exact container termination, dimensions, pixel
count, and frame count. Sharp fully decodes and writes a metadata-free,
single-frame 128×128 WebP. Only that derivative can enter the public
`goneviral-logo-public` bucket and become a listing's selected logo. The app
never fetches a user-provided remote image.

Database checks and triggers prevent incomplete assets from becoming `ready`,
prevent a listing from selecting another listing's asset or an unsanitized
asset, and keep a ready asset's storage payload immutable. Public read models
join the selected asset only when it is `ready` and belongs to the same listing.

The daily `/api/cron/cleanup-logo-assets` job requires the shared scheduler
`CRON_SECRET`, deletes expired staging/rejected objects and unselected
replacement objects, then removes their unreferenced database rows. Object
cleanup remains retryable if Storage is unavailable.

## Edit risk policy

For a moderation-clear listing, these changes can publish after server
validation:

- tagline;
- a minor name correction whose NFKC/lowercase identity is unchanged;
- a destination path or query change on the exact approved host;
- a sanitized logo replacement.

A material name change, destination host change, or category change creates one
deduplicated pending `private.listing_change_requests` record. Any change to a
listing that is not moderation-clear also waits for review. The current public
identity remains live while review is pending. Immediate changes create an
approved audit record, increment the listing version, and invalidate all public
board, category, detail, activity, and Today cache tags that can show the value.

Destination canonical identity is checked before either immediate publication
or a pending host request. A destination already assigned to another listing is
rejected. A future admin workflow may deliberately resolve or reassign it with
the required audit trail; owner edits cannot silently take it over. Phase 10
owns the full review UI and approval mutations.

## Deployment requirements and current gate

Configure both buckets from `supabase/config.toml`, a current server-only
`SUPABASE_SECRET_KEY`, public Supabase URL/publishable key, an HMAC secret, and a
server-only `CRON_SECRET`. The public bucket may contain only WebP derivatives;
the staging bucket must remain private. Storage object operations use the
Supabase Storage API—never direct writes to the `storage` database schema.

The current local Supabase database and Auth services are available, but the
local Storage service is not. Phase 8 therefore verifies the full database,
authorization, path binding, sanitization, replacement, and cleanup behavior
with deterministic Storage doubles. A genuine private upload and public object
delivery test remains a hosted/local-infrastructure gate and is not represented
as passed.

Payments are outside Phase 8. Dodo Payments remains the current payment provider
behind the replaceable checkout and webhook adapters documented in
`PAYMENTS_AND_RAISES.md`; adding or replacing a provider later does not change
the logo or edit security model.
