-- MANYA: Concept Mastery Table for Spaced Repetition
-- Run this in Supabase SQL Editor

-- Create concept_mastery table
CREATE TABLE IF NOT EXISTS concept_mastery (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subject TEXT NOT NULL,
    base_id TEXT NOT NULL,
    mastery_level TEXT DEFAULT 'new',
    review_count INTEGER DEFAULT 0,
    last_reviewed_at TIMESTAMPTZ,
    next_review_at TIMESTAMPTZ,
    correct_streak INTEGER DEFAULT 0,
    total_attempts INTEGER DEFAULT 0,
    total_correct INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, subject, base_id)
);

-- Enable RLS
ALTER TABLE concept_mastery ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own mastery data
CREATE POLICY "Users manage own mastery" ON concept_mastery
    FOR ALL USING (auth.uid() = user_id);

-- Performance index
CREATE INDEX IF NOT EXISTS idx_concept_mastery_user_subject 
    ON concept_mastery(user_id, subject);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_review 
    ON concept_mastery(user_id, next_review_at);

-- Add optional analytics columns to user_answers (safe to skip if table doesn't exist yet)
DO $$ 
BEGIN
    ALTER TABLE user_answers ADD COLUMN IF NOT EXISTS time_of_day TEXT;
    ALTER TABLE user_answers ADD COLUMN IF NOT EXISTS day_of_week TEXT;
    ALTER TABLE user_answers ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'user_answers columns already exist or table missing';
END $$;
