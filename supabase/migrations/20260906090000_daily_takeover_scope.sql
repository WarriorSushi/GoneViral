ALTER TABLE "private"."payment_attempts"
  ADD COLUMN "ranking_scope" text DEFAULT 'all_time' NOT NULL,
  ADD COLUMN "target_business_date_snapshot" date;

ALTER TABLE "private"."payment_attempts"
  ADD CONSTRAINT "payment_attempts_ranking_scope_valid"
    CHECK ("ranking_scope" IN ('all_time', 'daily')),
  ADD CONSTRAINT "payment_attempts_ranking_scope_snapshot_valid"
    CHECK (
      ("ranking_scope" = 'all_time' AND "target_business_date_snapshot" IS NULL)
      OR
      ("ranking_scope" = 'daily' AND "target_listing_id_snapshot" IS NOT NULL
        AND "target_rank_snapshot" IS NOT NULL
        AND "target_total_paise_snapshot" IS NOT NULL
        AND "target_business_date_snapshot" IS NOT NULL)
    );

CREATE FUNCTION "private"."protect_payment_attempt_ranking_scope"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF (NEW.ranking_scope, NEW.target_business_date_snapshot)
     IS DISTINCT FROM (OLD.ranking_scope, OLD.target_business_date_snapshot) THEN
    RAISE EXCEPTION 'payment attempt ranking scope fields are immutable'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION "private"."protect_payment_attempt_ranking_scope"() FROM PUBLIC;

CREATE TRIGGER "payment_attempts_ranking_scope_immutable"
BEFORE UPDATE ON "private"."payment_attempts"
FOR EACH ROW EXECUTE FUNCTION "private"."protect_payment_attempt_ranking_scope"();

COMMENT ON COLUMN "private"."payment_attempts"."ranking_scope" IS
  'Server-validated leaderboard scope used to calculate a takeover quote.';
COMMENT ON COLUMN "private"."payment_attempts"."target_business_date_snapshot" IS
  'Asia/Kolkata business date used for a Daily target quote; null for All time.';
