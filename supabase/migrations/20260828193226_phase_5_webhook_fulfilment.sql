-- Phase 5 hardens the identities used by the application-level locked
-- fulfilment transaction. Multiple provider payments may belong to one
-- checkout attempt, but only one may ever carry its fulfilment ledger link.
CREATE UNIQUE INDEX "provider_payments_fulfilled_attempt_unique"
  ON "private"."provider_payments" ("payment_attempt_id")
  WHERE "fulfilled_ledger_entry_id" IS NOT NULL;

ALTER TABLE "private"."provider_events"
  ADD CONSTRAINT "provider_events_terminal_fields_valid"
  CHECK (
    "processing_state" NOT IN ('processed', 'quarantined')
    OR (
      "signature_status" = 'verified'
      AND "processed_at" IS NOT NULL
    )
  ) NOT VALID;

ALTER TABLE "private"."provider_events"
  VALIDATE CONSTRAINT "provider_events_terminal_fields_valid";

CREATE FUNCTION "private"."protect_provider_event_identity"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF (
    NEW.provider,
    NEW.provider_environment,
    NEW.provider_event_id,
    NEW.provider_event_type,
    NEW.signature_status,
    NEW.raw_body_digest,
    NEW.provider_created_at,
    NEW.received_at
  ) IS DISTINCT FROM (
    OLD.provider,
    OLD.provider_environment,
    OLD.provider_event_id,
    OLD.provider_event_type,
    OLD.signature_status,
    OLD.raw_body_digest,
    OLD.provider_created_at,
    OLD.received_at
  ) THEN
    RAISE EXCEPTION 'provider event identity is immutable'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION "private"."protect_provider_event_identity"() FROM PUBLIC;

CREATE TRIGGER "provider_events_identity_immutable"
BEFORE UPDATE ON "private"."provider_events"
FOR EACH ROW EXECUTE FUNCTION "private"."protect_provider_event_identity"();

CREATE FUNCTION "private"."protect_provider_payment_identity"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF (
    NEW.provider,
    NEW.provider_environment,
    NEW.provider_payment_id,
    NEW.provider_order_id,
    NEW.payment_attempt_id,
    NEW.amount_paise,
    NEW.currency,
    NEW.first_seen_at
  ) IS DISTINCT FROM (
    OLD.provider,
    OLD.provider_environment,
    OLD.provider_payment_id,
    OLD.provider_order_id,
    OLD.payment_attempt_id,
    OLD.amount_paise,
    OLD.currency,
    OLD.first_seen_at
  ) THEN
    RAISE EXCEPTION 'provider payment identity is immutable'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION "private"."protect_provider_payment_identity"() FROM PUBLIC;

CREATE TRIGGER "provider_payments_identity_immutable"
BEFORE UPDATE ON "private"."provider_payments"
FOR EACH ROW EXECUTE FUNCTION "private"."protect_provider_payment_identity"();
