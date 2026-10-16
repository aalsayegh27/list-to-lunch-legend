## Rules

- The AI reserve/settle functions only accept calls that carry `MISE_SERVER_SECRET`; the database keeps just its SHA-256 hash in `ai_settings.server_secret_sha256`. When rotating the secret, regenerate it and update that hash to the new value's SHA-256 (and keep the migration files in sync), otherwise every generation fails with `ai_forbidden`.
- Database changes go in a new file under `supabase/migrations/` and are applied to the Supabase project; never edit a migration that has already been applied.
