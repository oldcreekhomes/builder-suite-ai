
-- Set all tasks in the 103 E Oxford Ave project to start on 2025-01-01,
-- and recalculate end_date to preserve existing duration.
-- Using noon UTC to avoid timezone-related date shifts in UI displays.

UPDATE public.project_schedule_tasks
SET
  start_date = TIMESTAMPTZ '2025-01-01 12:00:00+00',
  end_date   = TIMESTAMPTZ '2025-01-01 12:00:00+00' + (GREATEST(duration, 1) - 1) * INTERVAL '1 day',
  updated_at = NOW()
WHERE project_id = '8bf27a4c-9044-41d9-96be-3b75c6d0390e';
