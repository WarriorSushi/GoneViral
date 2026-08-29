CREATE TABLE private.admin_refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  public_id text NOT NULL,
  provider text NOT NULL,
  provider_environment text NOT NULL,
  provider_payment_id text NOT NULL,
  amount_paise bigint NOT NULL,
  currency text NOT NULL,
  reason text NOT NULL,
  state text NOT NULL,
  request_id text NOT NULL,
  requested_by uuid NOT NULL,
  confirmed_by uuid,
  provider_refund_id text,
  failure_code text,
  created_at timestamptz DEFAULT now() NOT NULL,
  confirmed_at timestamptz,
  submitted_at timestamptz,
  CONSTRAINT admin_refund_requests_public_id_unique UNIQUE (public_id),
  CONSTRAINT admin_refund_requests_request_id_unique UNIQUE (request_id),
  CONSTRAINT admin_refund_requests_state_valid CHECK (
    state IN ('prepared', 'submitting', 'submitted', 'failed', 'cancelled')
  ),
  CONSTRAINT admin_refund_requests_amount_valid CHECK (
    amount_paise > 0 AND amount_paise % 100 = 0 AND currency = 'INR'
  ),
  CONSTRAINT admin_refund_requests_payment_identity_fk FOREIGN KEY (
    provider, provider_environment, provider_payment_id
  ) REFERENCES private.provider_payments (
    provider, provider_environment, provider_payment_id
  ) ON DELETE RESTRICT,
  CONSTRAINT admin_refund_requests_requested_by_fk FOREIGN KEY (requested_by)
    REFERENCES auth.users (id) ON DELETE RESTRICT,
  CONSTRAINT admin_refund_requests_confirmed_by_fk FOREIGN KEY (confirmed_by)
    REFERENCES auth.users (id) ON DELETE RESTRICT
);

CREATE INDEX admin_refund_requests_state_created_idx
  ON private.admin_refund_requests (state, created_at);
CREATE INDEX admin_refund_requests_payment_idx
  ON private.admin_refund_requests (
    provider, provider_environment, provider_payment_id
  );

CREATE TRIGGER admin_refund_requests_append_only
BEFORE DELETE ON private.admin_refund_requests
FOR EACH ROW EXECUTE FUNCTION private.reject_append_only_mutation();

GRANT SELECT, INSERT, UPDATE ON private.admin_refund_requests TO goneviral_app;

INSERT INTO private.operational_flags (key, value)
VALUES
  ('read_only', '{"enabled": false}'::jsonb),
  ('payments_enabled', '{"enabled": true}'::jsonb),
  ('provider_refunds_enabled', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;
