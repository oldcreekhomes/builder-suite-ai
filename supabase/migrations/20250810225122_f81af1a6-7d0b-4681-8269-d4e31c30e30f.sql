-- Remove the redundant order_index column since hierarchy_number handles both hierarchy and ordering
ALTER TABLE project_schedule_tasks DROP COLUMN order_index;