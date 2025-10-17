-- Add reminder_sent_at column to project_bids table
ALTER TABLE project_bids 
ADD COLUMN IF NOT EXISTS reminder_sent_at timestamp with time zone;

-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create scheduled job to send bid reminders daily at 8:30 AM
SELECT cron.schedule(
  'send-bid-reminders-daily',
  '30 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://nlmnwlvmmkngrgatnzkj.supabase.co/functions/v1/send-bid-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sbW53bHZtbWtuZ3JnYXRuemtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDU3OTgsImV4cCI6MjA2NjE4MTc5OH0.gleBmte9X1uQWYaTxX-dLWVqk6Hpvb_qjseN_aG6xM0"}'::jsonb
  );
  $$
);