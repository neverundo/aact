-- Dev-only SMTP credential for the AACT Compose stack.
-- Password (plaintext, local only): aact_dev_mail_secret
INSERT INTO "Credential" (id, username, "passwordHash", label, "createdAt", "revokedAt")
VALUES (
  'aact_localfakemail_dev_credential',
  'lfm_aact_localdev',
  '$2b$12$ZrKTRhAhQcV1D3FG8rQKNe4tG7mpEs1qgFvbSj9jQy/qEgj5ttm5O',
  'aact-compose',
  NOW(),
  NULL
)
ON CONFLICT (username) DO NOTHING;
