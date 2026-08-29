INSERT INTO private.operational_flags (key, value)
VALUES ('outbound_redirects_enabled', '{"enabled": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

