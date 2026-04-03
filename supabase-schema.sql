-- GibiPulse Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE issue_type AS ENUM (
  'water', 'electricity', 'internet', 'cleaning', 
  'structural', 'security', 'other'
);
CREATE TYPE severity_level AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE issue_status AS ENUM ('open', 'assigned', 'in_progress', 'resolved');

-- Report Groups (deduplicated clusters)
CREATE TABLE report_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_type issue_type NOT NULL,
  location TEXT NOT NULL,
  severity severity_level NOT NULL DEFAULT 'medium',
  status issue_status NOT NULL DEFAULT 'open',
  ai_summary TEXT NOT NULL,
  report_count INTEGER NOT NULL DEFAULT 1,
  assigned_to TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Individual Reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL,
  raw_message TEXT NOT NULL,
  issue_type issue_type NOT NULL,
  location TEXT NOT NULL,
  severity severity_level NOT NULL DEFAULT 'medium',
  status issue_status NOT NULL DEFAULT 'open',
  ai_summary TEXT NOT NULL,
  group_id UUID REFERENCES report_groups(id) ON DELETE SET NULL,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  assigned_to TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_reports_group_id ON reports(group_id);
CREATE INDEX idx_reports_student_id ON reports(student_id);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX idx_groups_status ON report_groups(status);
CREATE INDEX idx_groups_created_at ON report_groups(created_at DESC);
CREATE INDEX idx_groups_type_location ON report_groups(issue_type, location);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_groups_updated_at
  BEFORE UPDATE ON report_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS Policies
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_groups ENABLE ROW LEVEL SECURITY;

-- Anyone (students) can INSERT reports
CREATE POLICY "Students can submit reports"
  ON reports FOR INSERT
  WITH CHECK (true);

-- Anyone can read report groups (for live feed)
CREATE POLICY "Public can read groups"
  ON report_groups FOR SELECT
  USING (true);

-- Anyone can insert report groups (via API)
CREATE POLICY "API can insert groups"
  ON report_groups FOR INSERT
  WITH CHECK (true);

-- Only authenticated users (admins) can update groups
CREATE POLICY "Admins can update groups"
  ON report_groups FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Admins can read all individual reports
CREATE POLICY "Admins can read all reports"  
  ON reports FOR SELECT
  USING (auth.role() = 'authenticated');

-- Reports can be updated by admins
CREATE POLICY "Admins can update reports"
  ON reports FOR UPDATE
  USING (auth.role() = 'authenticated');
