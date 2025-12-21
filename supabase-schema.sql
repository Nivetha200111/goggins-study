-- Run this in your Supabase SQL Editor

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  total_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak INTEGER DEFAULT 0,
  last_active_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invite codes table
CREATE TABLE invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  uses_remaining INTEGER, -- NULL = unlimited
  expires_at TIMESTAMPTZ, -- NULL = never expires
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study tabs table
CREATE TABLE study_tabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#ff6b4a',
  focus_minutes REAL DEFAULT 0,
  distractions INTEGER DEFAULT 0,
  xp INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_tabs ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for anon key - simple approach)
CREATE POLICY "Allow all for users" ON users FOR ALL USING (true);
CREATE POLICY "Allow read for invite_codes" ON invite_codes FOR SELECT USING (true);
CREATE POLICY "Allow update for invite_codes" ON invite_codes FOR UPDATE USING (true);
CREATE POLICY "Allow all for study_tabs" ON study_tabs FOR ALL USING (true);

-- Insert some invite codes
INSERT INTO invite_codes (code, uses_remaining) VALUES
  ('FOCUS2024', NULL),
  ('GOGGINS', NULL),
  ('DISCIPLINE', 100),
  ('STUDY4LIFE', 50);
