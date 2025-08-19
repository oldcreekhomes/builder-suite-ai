-- Reset all task start dates to 01/01/2025 for project 494d10f1-cbb4-4f64-9ee9-92e755cb088f
-- This is ONLY for 923 17th St. South Arlington, VA 22205

UPDATE public.project_schedule_tasks 
SET 
  start_date = '2025-01-01'::timestamp with time zone,
  end_date = '2025-01-01'::timestamp with time zone + (duration || ' days')::interval,
  updated_at = NOW()
WHERE project_id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f';