-- Run this in your Supabase SQL Editor

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  total_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak INTEGER DEFAULT 0,
  last_active_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enforce unique usernames (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx ON users (lower(username));

-- Invite codes table
CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  uses_remaining INTEGER, -- NULL = unlimited
  expires_at TIMESTAMPTZ, -- NULL = never expires
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study tabs table
CREATE TABLE IF NOT EXISTS study_tabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#ff6b4a',
  focus_minutes REAL DEFAULT 0,
  distractions INTEGER DEFAULT 0,
  xp INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Whitelist table
CREATE TABLE IF NOT EXISTS whitelists (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  domains TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  apps TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whitelists ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for anon key - simple approach)
DROP POLICY IF EXISTS "Allow all for users" ON users;
DROP POLICY IF EXISTS "Allow read for invite_codes" ON invite_codes;
DROP POLICY IF EXISTS "Allow update for invite_codes" ON invite_codes;
DROP POLICY IF EXISTS "Allow all for study_tabs" ON study_tabs;
DROP POLICY IF EXISTS "Allow all for whitelists" ON whitelists;

CREATE POLICY "Allow all for users" ON users FOR ALL USING (true);
CREATE POLICY "Allow read for invite_codes" ON invite_codes FOR SELECT USING (true);
CREATE POLICY "Allow update for invite_codes" ON invite_codes FOR UPDATE USING (true);
CREATE POLICY "Allow all for study_tabs" ON study_tabs FOR ALL USING (true);
CREATE POLICY "Allow all for whitelists" ON whitelists FOR ALL USING (true);

-- Insert some invite codes
INSERT INTO invite_codes (code, uses_remaining) VALUES
  ('FOCUS2024', NULL),
  ('GOGGINS', NULL),
  ('DISCIPLINE', 100),
  ('STUDY4LIFE', 50)
ON CONFLICT (code) DO NOTHING;
