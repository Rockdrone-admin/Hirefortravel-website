-- Production readiness patch for restored auth and prospect integrity.
-- Apply after reviewing duplicate prospect rows; the unique indexes below fail if duplicates already exist.

BEGIN;

-- Default role permission rows so protected admin actions do not fail just because the seed data is missing.
INSERT INTO role_permissions (role, environment, permissions)
VALUES
  ('SUPER_ADMIN', 'development', '{"can_access_dashboard": true, "can_access_jobs": true, "can_access_companies": true, "can_access_prospects": true, "can_access_activity": true, "can_access_settings": true}'::jsonb),
  ('ADMIN', 'development', '{"can_access_dashboard": true, "can_access_jobs": true, "can_access_companies": true, "can_access_prospects": true, "can_access_activity": true, "can_access_settings": true}'::jsonb),
  ('RECRUITER', 'development', '{"can_access_dashboard": true, "can_access_jobs": true, "can_access_companies": true, "can_access_prospects": true, "can_access_activity": true, "can_access_settings": false}'::jsonb),
  ('SUPER_ADMIN', 'production', '{"can_access_dashboard": true, "can_access_jobs": true, "can_access_companies": true, "can_access_prospects": true, "can_access_activity": true, "can_access_settings": true}'::jsonb),
  ('ADMIN', 'production', '{"can_access_dashboard": true, "can_access_jobs": true, "can_access_companies": true, "can_access_prospects": true, "can_access_activity": true, "can_access_settings": true}'::jsonb),
  ('RECRUITER', 'production', '{"can_access_dashboard": true, "can_access_jobs": true, "can_access_companies": true, "can_access_prospects": true, "can_access_activity": true, "can_access_settings": false}'::jsonb)
ON CONFLICT (role, environment) DO UPDATE SET permissions = EXCLUDED.permissions;

-- Give the legacy public uuid field a stable generated value and enforce uniqueness.
ALTER TABLE prospects ALTER COLUMN uuid SET DEFAULT uuid_generate_v4();
UPDATE prospects SET uuid = uuid_generate_v4() WHERE uuid IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_prospects_uuid_unique ON prospects(uuid);

-- Make LinkedIn URL and dedupe identity environment-scoped, matching the application queries.
ALTER TABLE prospects DROP CONSTRAINT IF EXISTS prospects_linkedin_url_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_prospects_linkedin_url_env_unique ON prospects(linkedin_url, environment) WHERE linkedin_url IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_prospects_dedupe_hash_env_unique ON prospects(dedupe_hash, environment) WHERE dedupe_hash IS NOT NULL;

COMMIT;
