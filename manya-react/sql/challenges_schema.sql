-- MANYA CHALLENGES: Schema Setup
-- Run this FIRST before inserting challenges

-- Step 1: Drop old tables if migrating
-- DROP TABLE IF EXISTS public.user_challenge_progress;
-- DROP TABLE IF EXISTS public.daily_challenges;

-- Step 2: Add challenge_day to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS challenge_day integer DEFAULT 1;

-- Step 3: Create challenge definitions table
CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  day_number integer NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  challenge_type text NOT NULL,
  target_value integer NOT NULL,
  reward_type text DEFAULT 'gems',
  reward_value integer DEFAULT 10,
  subject text DEFAULT 'all',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT challenges_pkey PRIMARY KEY (id)
);

-- Step 4: Create user progress tracking table
CREATE TABLE IF NOT EXISTS public.user_challenges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  challenge_id uuid NOT NULL,
  current_value integer DEFAULT 0,
  is_completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  last_updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_challenges_pkey PRIMARY KEY (id),
  CONSTRAINT user_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id),
  CONSTRAINT user_challenges_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.challenges (id),
  CONSTRAINT user_challenges_unique UNIQUE (user_id, challenge_id)
);

-- Step 5: Run the 4 INSERT files in order:
-- challenges_q1.sql (Days 1-90)
-- challenges_q2.sql (Days 91-180)
-- challenges_q3.sql (Days 181-270)
-- challenges_q4.sql (Days 271-365)
