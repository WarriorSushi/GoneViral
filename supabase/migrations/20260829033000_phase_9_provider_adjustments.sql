-- Provider notifications are not causally ordered. Dodo can deliver a refund or
-- dispute before the corresponding payment succeeds (or before its webhook has
-- been processed), so adjustment identity must be durable independently of the
-- local provider payment projection. The indexed identity columns still link the
-- records once the payment arrives; application code performs the guarded link.
ALTER TABLE private.provider_adjustments
  DROP CONSTRAINT provider_adjustments_payment_identity_fk;

COMMENT ON COLUMN private.provider_adjustments.provider_payment_id IS
  'Provider payment identity from the adjustment payload. May precede the local provider_payments row and is linked during convergence/reconciliation.';
