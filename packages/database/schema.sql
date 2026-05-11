-- Create enum for environment
CREATE TYPE app_environment AS ENUM ('development', 'production');

-- JOBS table
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
  environment app_environment NOT NULL DEFAULT 'development'
);

-- CLIENT_LOGOS table
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

-- ANALYTICS_EVENTS table
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  page TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  environment app_environment NOT NULL DEFAULT 'development'
);

-- ADMIN_USERS table
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  reset_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  environment app_environment NOT NULL DEFAULT 'development'
);

-- RLS (Row Level Security) - restrict by environment
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active jobs" ON jobs FOR SELECT USING (status = 'active');
-- Note: Further RLS policies should be implemented to securely allow Admin API inserts.

ALTER TABLE client_logos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read visible logos" ON client_logos FOR SELECT USING (is_visible = TRUE);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
-- No public read access for analytics

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
-- No public access to admin users
