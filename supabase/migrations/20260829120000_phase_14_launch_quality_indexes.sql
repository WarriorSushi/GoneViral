-- Phase 14 measured read-path indexes. These are additive and do not change
-- ledger, ranking, payment, webhook, or authorization semantics.

CREATE INDEX listings_public_ranking_idx
ON app.listings (
  confirmed_total_paise DESC,
  current_total_reached_at ASC,
  id ASC
)
WHERE lifecycle_status = 'active'
  AND moderation_status = 'clear'
  AND confirmed_total_paise > 0;

CREATE INDEX listings_public_category_ranking_idx
ON app.listings (
  category_id,
  confirmed_total_paise DESC,
  current_total_reached_at ASC,
  id ASC
)
WHERE lifecycle_status = 'active'
  AND moderation_status = 'clear'
  AND confirmed_total_paise > 0;

CREATE INDEX listings_admin_queue_updated_idx
ON app.listings (updated_at DESC, id)
WHERE moderation_status IN ('pending_review', 'suspended')
   OR lifecycle_status = 'removed';

CREATE INDEX provider_events_received_idx
ON private.provider_events (received_at DESC);

CREATE INDEX provider_events_quarantine_received_idx
ON private.provider_events (received_at DESC, id)
WHERE processing_state = 'quarantined';

CREATE INDEX email_outbox_worker_idx
ON private.email_outbox (next_attempt_at, created_at, id)
WHERE state IN ('pending', 'failed_retryable', 'sending');

CREATE INDEX email_outbox_exception_created_idx
ON private.email_outbox (created_at DESC, id)
WHERE state IN ('failed_retryable', 'dead_letter')
   OR delivery_state IN (
     'delayed', 'bounced', 'complained', 'failed', 'suppressed'
   );

CREATE INDEX reconciliation_items_open_created_idx
ON private.reconciliation_items (created_at DESC, id)
WHERE state IN ('open', 'investigating');
