# Dodo webhook fixtures

`local-payment-succeeded.json` is a synthetic, redacted local contract vector.
Tests sign its exact raw bytes with Standard Webhooks and verify them through
the pinned official Dodo Payments TypeScript SDK. It is not represented as a
payload recorded from Dodo test mode; a genuine signed sandbox fixture remains
an external credential-dependent gate.
