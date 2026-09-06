CREATE TABLE "private"."site_visit_dedupe" (
  "business_date" date NOT NULL,
  "visitor_hmac" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  CONSTRAINT "site_visit_dedupe_business_date_visitor_hmac_pk"
    PRIMARY KEY ("business_date", "visitor_hmac"),
  CONSTRAINT "site_visit_dedupe_expiry_after_creation"
    CHECK ("private"."site_visit_dedupe"."expires_at" > "private"."site_visit_dedupe"."created_at")
);

CREATE TABLE "private"."site_visit_daily_totals" (
  "business_date" date PRIMARY KEY NOT NULL,
  "unique_visits" bigint DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "site_visit_daily_totals_nonnegative"
    CHECK ("private"."site_visit_daily_totals"."unique_visits" >= 0)
);

CREATE INDEX "site_visit_dedupe_expiry_idx"
  ON "private"."site_visit_dedupe" USING btree ("expires_at");

REVOKE ALL ON "private"."site_visit_dedupe", "private"."site_visit_daily_totals"
  FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT, INSERT, DELETE ON "private"."site_visit_dedupe" TO goneviral_app;
GRANT SELECT, INSERT, UPDATE ON "private"."site_visit_daily_totals" TO goneviral_app;
