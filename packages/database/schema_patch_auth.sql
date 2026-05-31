-- 1. ADD NEW COLUMNS TO EXISTING admin_users TABLE
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'RECRUITER' CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'RECRUITER')),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_login_ip TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES admin_users(id);

-- 2. CREATE admin_sessions TABLE
CREATE TABLE IF NOT EXISTS admin_sessions (
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
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);

-- 3. CREATE activity_events TABLE
CREATE TABLE IF NOT EXISTS activity_events (
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
CREATE INDEX IF NOT EXISTS idx_activity_events_user ON activity_events(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_entity ON activity_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_type ON activity_events(event_type);

-- 4. ADD ROW LEVEL SECURITY (RLS) FOR NEW TABLES
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

-- 5. CREATE role_permissions TABLE
CREATE TABLE IF NOT EXISTS role_permissions (
  role TEXT CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'RECRUITER')),
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  environment app_environment NOT NULL DEFAULT 'development',
  PRIMARY KEY (role, environment)
);
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
