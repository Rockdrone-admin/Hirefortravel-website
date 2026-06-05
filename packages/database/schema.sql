-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for environment
CREATE TYPE app_environment AS ENUM ('development', 'production');

-- ==========================================
-- 1. JOBS TABLE
-- ==========================================
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  location TEXT NOT NULL,
  experience TEXT NOT NULL,
  salary TEXT,
  about_role TEXT NOT NULL DEFAULT '',
  responsibilities TEXT[] NOT NULL DEFAULT '{}',
  requirements TEXT[] NOT NULL DEFAULT '{}',
  benefits TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'archived')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  environment app_environment NOT NULL DEFAULT 'development',
  
  -- Internal Sourcing fields
  real_company_name TEXT,
  competitors TEXT[] DEFAULT '{}'::text[],
  alternative_titles TEXT[] DEFAULT '{}'::text[],
  number_of_openings INTEGER DEFAULT 1,
  notes TEXT[] DEFAULT '{}'::text[]
);

COMMENT ON COLUMN jobs.real_company_name IS 'Mandatory field (For Internal Use Only) containing the actual hiring company name for AI query generation and candidate suitability scoring.';
COMMENT ON COLUMN jobs.competitors IS 'Mandatory field (For Internal Use Only) containing the list of competitor companies to target for AI sourcing.';
COMMENT ON COLUMN jobs.alternative_titles IS 'Alternative job titles used by the AI sourcing workflow for search query generation.';
COMMENT ON COLUMN jobs.number_of_openings IS 'The number of available openings/positions for this job role.';
COMMENT ON COLUMN jobs.notes IS 'Optional field containing custom notes about the job role, displayed in bulleted form below the About the Role section.';

-- ==========================================
-- 2. CLIENT_LOGOS TABLE
-- ==========================================
CREATE TABLE client_logos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  alt_text TEXT,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  environment app_environment NOT NULL DEFAULT 'development'
);

-- ==========================================
-- 3. ANALYTICS_EVENTS TABLE
-- ==========================================
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  page TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  environment app_environment NOT NULL DEFAULT 'development'
);

-- ==========================================
-- 4. ADMIN_USERS TABLE
-- ==========================================
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'RECRUITER' CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'RECRUITER')),
  is_active BOOLEAN DEFAULT TRUE,
  permissions JSONB DEFAULT '{}'::jsonb,
  must_reset_password BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  last_login_ip TEXT,
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  reset_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  environment app_environment NOT NULL DEFAULT 'development'
);

-- ==========================================
-- 5. ROLE_PERMISSIONS TABLE
-- ==========================================
CREATE TABLE role_permissions (
  role TEXT CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'RECRUITER')),
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  environment app_environment NOT NULL DEFAULT 'development',
  PRIMARY KEY (role, environment)
);

INSERT INTO role_permissions (role, environment, permissions)
VALUES
  ('SUPER_ADMIN', 'development', '{"can_access_dashboard": true, "can_access_jobs": true, "can_access_companies": true, "can_access_prospects": true, "can_access_activity": true, "can_access_settings": true}'::jsonb),
  ('ADMIN', 'development', '{"can_access_dashboard": true, "can_access_jobs": true, "can_access_companies": true, "can_access_prospects": true, "can_access_activity": true, "can_access_settings": true}'::jsonb),
  ('RECRUITER', 'development', '{"can_access_dashboard": true, "can_access_jobs": true, "can_access_companies": true, "can_access_prospects": true, "can_access_activity": true, "can_access_settings": false}'::jsonb),
  ('SUPER_ADMIN', 'production', '{"can_access_dashboard": true, "can_access_jobs": true, "can_access_companies": true, "can_access_prospects": true, "can_access_activity": true, "can_access_settings": true}'::jsonb),
  ('ADMIN', 'production', '{"can_access_dashboard": true, "can_access_jobs": true, "can_access_companies": true, "can_access_prospects": true, "can_access_activity": true, "can_access_settings": true}'::jsonb),
  ('RECRUITER', 'production', '{"can_access_dashboard": true, "can_access_jobs": true, "can_access_companies": true, "can_access_prospects": true, "can_access_activity": true, "can_access_settings": false}'::jsonb)
ON CONFLICT (role, environment) DO NOTHING;

-- ==========================================
-- 6. ADMIN_SESSIONS TABLE
-- ==========================================
CREATE TABLE admin_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  session_token UUID NOT NULL DEFAULT uuid_generate_v4(),
  ip_address TEXT,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  environment app_environment NOT NULL DEFAULT 'development'
);

-- ==========================================
-- 7. ACTIVITY_EVENTS TABLE
-- ==========================================
CREATE TABLE activity_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  user_name TEXT,
  role TEXT,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  environment app_environment NOT NULL DEFAULT 'development'
);

-- ==========================================
-- 8. SOURCING_RUNS TABLE
-- ==========================================
CREATE TABLE sourcing_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status TEXT NOT NULL DEFAULT 'running',
  positions_targeted UUID[] NOT NULL DEFAULT '{}'::uuid[],
  total_discovered INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  environment app_environment NOT NULL DEFAULT 'development',
  
  -- Progress tracking columns
  current_phase TEXT,
  progress_percent INTEGER,
  total_jobs INTEGER,
  jobs_completed INTEGER,
  total_expected_enrichments INTEGER
);

-- ==========================================
-- 9. PROSPECTS TABLE
-- ==========================================
CREATE TABLE prospects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  city TEXT,
  latest_title TEXT,
  latest_company TEXT,
  functional_field TEXT,
  total_experience TEXT,
  linkedin_url TEXT,
  source TEXT NOT NULL,
  dedupe_hash TEXT,
  enrichment_confidence TEXT,
  raw_enrichment_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  environment app_environment NOT NULL DEFAULT 'development'
);

-- ==========================================
-- 10. SOURCING_STRATEGIES TABLE
-- ==========================================
CREATE TABLE sourcing_strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  run_id UUID REFERENCES sourcing_runs(id) ON DELETE CASCADE,
  functional_field TEXT,
  angle_name TEXT NOT NULL,
  boolean_queries JSONB DEFAULT '[]'::jsonb,
  targeted_competitors TEXT[] DEFAULT '{}'::text[],
  targeted_keywords TEXT[] DEFAULT '{}'::text[],
  total_discovered INTEGER DEFAULT 0,
  high_score_count INTEGER DEFAULT 0,
  crm_promoted_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  environment app_environment NOT NULL DEFAULT 'development'
);

-- ==========================================
-- 11. PROSPECT_MATCHES TABLE
-- ==========================================
CREATE TABLE prospect_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'IDENTIFIED',
  ai_score INTEGER,
  manual_score INTEGER,
  ai_reasoning TEXT,
  human_notes TEXT,
  active_flag BOOLEAN DEFAULT TRUE,
  primary_flag BOOLEAN DEFAULT FALSE,
  owner TEXT,
  tags TEXT[] DEFAULT '{}'::text[],
  followup_due_at TIMESTAMP WITH TIME ZONE,
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  lifecycle_timestamps JSONB DEFAULT '{}'::jsonb,
  discovered_by_strategy_id UUID REFERENCES sourcing_strategies(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  environment app_environment NOT NULL DEFAULT 'development',
  UNIQUE(prospect_id, job_id, environment)
);

-- ==========================================
-- 12. SOURCING_PROMPTS TABLE
-- ==========================================
CREATE TABLE sourcing_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_type TEXT NOT NULL,
  instructions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  environment app_environment NOT NULL DEFAULT 'development',
  UNIQUE(prompt_type, environment)
);

-- ==========================================
-- 13. SOURCING_PROMPT_VERSIONS TABLE
-- ==========================================
CREATE TABLE sourcing_prompt_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  environment app_environment NOT NULL DEFAULT 'development',
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- ==========================================
-- 14. PROSPECT_ACTIVITIES TABLE
-- ==========================================
CREATE TABLE prospect_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  changed_by TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  environment app_environment NOT NULL DEFAULT 'development'
);

-- ==========================================
-- RLS (ROW LEVEL SECURITY) POLICIES
-- ==========================================
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active jobs" ON jobs FOR SELECT USING (status = 'active');

ALTER TABLE client_logos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read visible logos" ON client_logos FOR SELECT USING (is_visible = TRUE);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sourcing_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sourcing_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE sourcing_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sourcing_prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_activities ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- DATABASE INDEXES
-- ==========================================
CREATE INDEX idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX idx_activity_events_user ON activity_events(user_id);
CREATE INDEX idx_activity_events_entity ON activity_events(entity_type, entity_id);
CREATE INDEX idx_activity_events_type ON activity_events(event_type);

CREATE INDEX idx_prospect_matches_prospect ON prospect_matches(prospect_id);
CREATE INDEX idx_prospect_matches_job ON prospect_matches(job_id);
CREATE INDEX idx_prospect_activities_prospect ON prospect_activities(prospect_id);
CREATE INDEX idx_prospect_activities_job ON prospect_activities(job_id);
CREATE INDEX idx_sourcing_strategies_job ON sourcing_strategies(job_id);
CREATE INDEX idx_sourcing_strategies_run ON sourcing_strategies(run_id);
CREATE UNIQUE INDEX idx_prospects_linkedin_url_env_unique ON prospects(linkedin_url, environment) WHERE linkedin_url IS NOT NULL;
CREATE UNIQUE INDEX idx_prospects_dedupe_hash_env_unique ON prospects(dedupe_hash, environment) WHERE dedupe_hash IS NOT NULL;
