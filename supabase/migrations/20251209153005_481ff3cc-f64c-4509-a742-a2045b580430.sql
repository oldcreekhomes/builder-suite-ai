-- Add last_schedule_published_at column to track when schedule was last published
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS last_schedule_published_at TIMESTAMPTZ;