ALTER TABLE "app"."listing_assets"
  ADD CONSTRAINT "listing_assets_staged_storage_complete"
  CHECK (
    state NOT IN ('staged', 'processing') OR (
      listing_id IS NOT NULL AND staging_bucket IS NOT NULL
      AND staging_object_key IS NOT NULL AND expires_at IS NOT NULL
    )
  ),
  ADD CONSTRAINT "listing_assets_ready_storage_complete"
  CHECK (
    state <> 'ready' OR (
      listing_id IS NOT NULL AND public_bucket = 'goneviral-logo-public'
      AND public_object_key IS NOT NULL AND content_type = 'image/webp'
      AND byte_size IS NOT NULL AND byte_size > 0
      AND width = 128 AND height = 128 AND sha256 IS NOT NULL
      AND processed_at IS NOT NULL
    )
  ),
  ADD CONSTRAINT "listing_assets_rejected_has_reason"
  CHECK (state <> 'rejected' OR rejection_code IS NOT NULL);

GRANT DELETE ON "app"."listing_assets" TO goneviral_app;

CREATE OR REPLACE FUNCTION "private"."enforce_selected_logo_ready"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.logo_asset_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM app.listing_assets AS asset
    WHERE asset.id = NEW.logo_asset_id
      AND asset.listing_id = NEW.id
      AND asset.kind = 'logo'
      AND asset.state = 'ready'
      AND asset.public_bucket = 'goneviral-logo-public'
      AND asset.public_object_key IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'selected logo must be a ready sanitized asset for this listing'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION "private"."enforce_selected_logo_ready"() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION "private"."enforce_selected_logo_ready"() TO goneviral_app;

CREATE TRIGGER "listings_selected_logo_ready"
BEFORE INSERT OR UPDATE OF logo_asset_id ON "app"."listings"
FOR EACH ROW EXECUTE FUNCTION "private"."enforce_selected_logo_ready"();

CREATE OR REPLACE FUNCTION "private"."protect_ready_logo_payload"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.state = 'ready' AND (
    NEW.listing_id IS DISTINCT FROM OLD.listing_id
    OR NEW.public_bucket IS DISTINCT FROM OLD.public_bucket
    OR NEW.public_object_key IS DISTINCT FROM OLD.public_object_key
    OR NEW.content_type IS DISTINCT FROM OLD.content_type
    OR NEW.byte_size IS DISTINCT FROM OLD.byte_size
    OR NEW.width IS DISTINCT FROM OLD.width
    OR NEW.height IS DISTINCT FROM OLD.height
    OR NEW.sha256 IS DISTINCT FROM OLD.sha256
    OR NEW.processed_at IS DISTINCT FROM OLD.processed_at
  ) THEN
    RAISE EXCEPTION 'ready sanitized logo payload is immutable'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION "private"."protect_ready_logo_payload"() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION "private"."protect_ready_logo_payload"() TO goneviral_app;

CREATE TRIGGER "listing_assets_ready_payload_immutable"
BEFORE UPDATE ON "app"."listing_assets"
FOR EACH ROW EXECUTE FUNCTION "private"."protect_ready_logo_payload"();
