-- Create investor_sessions table for tracking login analytics
CREATE TABLE IF NOT EXISTS investor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_slug TEXT NOT NULL,
  login_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index on investor_slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_investor_sessions_slug ON investor_sessions(investor_slug);

-- Create index on login_timestamp for sorting
CREATE INDEX IF NOT EXISTS idx_investor_sessions_login_timestamp ON investor_sessions(login_timestamp DESC);

-- Enable Row Level Security
ALTER TABLE investor_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow service role to do everything
CREATE POLICY "Service role can manage all sessions"
  ON investor_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
