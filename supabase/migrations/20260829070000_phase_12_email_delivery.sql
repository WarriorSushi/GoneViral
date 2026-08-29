ALTER TABLE private.email_outbox
  ADD COLUMN delivery_state text NOT NULL DEFAULT 'queued',
  ADD COLUMN delivery_updated_at timestamptz;

ALTER TABLE private.email_outbox
  ADD CONSTRAINT email_outbox_delivery_state_valid CHECK (
    delivery_state IN (
      'queued', 'accepted', 'sent', 'delivered', 'delayed', 'bounced',
      'complained', 'failed', 'suppressed'
    )
  );

CREATE UNIQUE INDEX email_outbox_provider_message_unique
  ON private.email_outbox (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE TABLE private.email_provider_events (
  event_id text PRIMARY KEY NOT NULL,
  outbox_id uuid,
  provider_message_id text NOT NULL,
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_provider_events_outbox_fk FOREIGN KEY (outbox_id)
    REFERENCES private.email_outbox (id) ON DELETE RESTRICT,
  CONSTRAINT email_provider_events_type_valid CHECK (
    event_type IN (
      'email.sent', 'email.delivered', 'email.delivery_delayed',
      'email.bounced', 'email.complained', 'email.failed', 'email.suppressed'
    )
  )
);

CREATE INDEX email_provider_events_message_occurred_idx
  ON private.email_provider_events (provider_message_id, occurred_at DESC);

CREATE TRIGGER email_provider_events_append_only
BEFORE UPDATE OR DELETE ON private.email_provider_events
FOR EACH ROW EXECUTE FUNCTION private.reject_append_only_mutation();

GRANT SELECT, INSERT ON private.email_provider_events TO goneviral_app;
