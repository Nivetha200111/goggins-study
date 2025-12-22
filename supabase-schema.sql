-- Run this in your Supabase SQL Editor

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  invite_code TEXT,
  contract_signed_at TIMESTAMPTZ,
  total_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak INTEGER DEFAULT 0,
  last_active_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enforce unique usernames (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx ON users (lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS users_invite_code_lower_idx
  ON users (lower(invite_code))
  WHERE invite_code IS NOT NULL;

-- Ensure existing tables get the contract column
ALTER TABLE users ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMPTZ;

-- Invite codes table
CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  uses_remaining INTEGER DEFAULT 1,
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
  ('FOCUS2024', 1),
  ('GOGGINS', 1),
  ('DISCIPLINE', 1),
  ('STUDY4LIFE', 1)
ON CONFLICT (code) DO NOTHING;
