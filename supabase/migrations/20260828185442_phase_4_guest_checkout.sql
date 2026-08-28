-- Phase 4 stores provider session data and the exact legal/contact snapshots
-- needed to recreate or safely inspect a guest checkout. These fields stay in
-- the private schema and are never projected by public reads.
ALTER TABLE "private"."payment_attempts"
  ADD COLUMN "provider_checkout_url" text,
  ADD COLUMN "customer_phone_e164" text,
  ADD COLUMN "terms_version" text,
  ADD COLUMN "privacy_version" text,
  ADD COLUMN "refund_policy_version" text,
  ADD COLUMN "content_policy_version" text;

ALTER TABLE "private"."payment_attempts"
  ADD CONSTRAINT "payment_attempts_phone_e164"
    CHECK ("customer_phone_e164" IS NULL OR "customer_phone_e164" ~ '^\+[1-9][0-9]{7,14}$'),
  ADD CONSTRAINT "payment_attempts_dodo_initial_fields"
    CHECK (
      "provider" <> 'dodo'
      OR "purpose" <> 'initial_sponsorship'
      OR (
        "customer_phone_e164" IS NOT NULL
        AND "terms_version" IS NOT NULL
        AND "privacy_version" IS NOT NULL
        AND "refund_policy_version" IS NOT NULL
        AND "content_policy_version" IS NOT NULL
      )
    ),
  ADD CONSTRAINT "payment_attempts_dodo_initial_maximum"
    CHECK (
      "provider" <> 'dodo'
      OR "purpose" <> 'initial_sponsorship'
      OR "amount_paise" <= 2147483600
    );

-- Extend the immutable intent trigger introduced in Phase 2. Provider session
-- identity and checkout URL are deliberately excluded because they are written
-- only after the external provider call commits.
CREATE OR REPLACE FUNCTION "private"."protect_payment_attempt_intent"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF (
    NEW.id,
    NEW.public_id,
    NEW.application_idempotency_key,
    NEW.provider,
    NEW.provider_environment,
    NEW.listing_id,
    NEW.purpose,
    NEW.amount_paise,
    NEW.currency,
    NEW.policy_version,
    NEW.minimum_required_paise_snapshot,
    NEW.target_listing_id_snapshot,
    NEW.target_rank_snapshot,
    NEW.target_total_paise_snapshot,
    NEW.listing_total_paise_snapshot,
    NEW.estimated_rank_snapshot,
    NEW.requested_by_user_id,
    NEW.pending_owner_id,
    NEW.provider_order_request_hash,
    NEW.customer_phone_e164,
    NEW.terms_version,
    NEW.privacy_version,
    NEW.refund_policy_version,
    NEW.content_policy_version,
    NEW.checkout_expires_at,
    NEW.created_at
  ) IS DISTINCT FROM (
    OLD.id,
    OLD.public_id,
    OLD.application_idempotency_key,
    OLD.provider,
    OLD.provider_environment,
    OLD.listing_id,
    OLD.purpose,
    OLD.amount_paise,
    OLD.currency,
    OLD.policy_version,
    OLD.minimum_required_paise_snapshot,
    OLD.target_listing_id_snapshot,
    OLD.target_rank_snapshot,
    OLD.target_total_paise_snapshot,
    OLD.listing_total_paise_snapshot,
    OLD.estimated_rank_snapshot,
    OLD.requested_by_user_id,
    OLD.pending_owner_id,
    OLD.provider_order_request_hash,
    OLD.customer_phone_e164,
    OLD.terms_version,
    OLD.privacy_version,
    OLD.refund_policy_version,
    OLD.content_policy_version,
    OLD.checkout_expires_at,
    OLD.created_at
  ) THEN
    RAISE EXCEPTION 'payment attempt intent fields are immutable'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION "private"."protect_payment_attempt_intent"() FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE ON "private"."payment_attempts" TO goneviral_app;
