-- ============================================
-- SUPABASE: Health Reports Table Setup
-- Execute this SQL in Supabase SQL Editor
-- ============================================

-- Create health_reports table
CREATE TABLE IF NOT EXISTS health_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cattle_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  tanggal_laporan DATE NOT NULL,
  gejala_keluhan TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key to auth.users
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index untuk query cepat
CREATE INDEX idx_health_reports_cattle_id ON health_reports(cattle_id);
CREATE INDEX idx_health_reports_user_id ON health_reports(user_id);
CREATE INDEX idx_health_reports_tanggal ON health_reports(tanggal_laporan);

-- Enable RLS (Row Level Security)
ALTER TABLE health_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users dapat read health reports mereka sendiri
CREATE POLICY "Users can view their own health reports"
  ON health_reports
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users dapat create health reports
CREATE POLICY "Users can create health reports"
  ON health_reports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users dapat update health reports mereka sendiri
CREATE POLICY "Users can update their own health reports"
  ON health_reports
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users dapat delete health reports mereka sendiri
CREATE POLICY "Users can delete their own health reports"
  ON health_reports
  FOR DELETE
  USING (auth.uid() = user_id);
