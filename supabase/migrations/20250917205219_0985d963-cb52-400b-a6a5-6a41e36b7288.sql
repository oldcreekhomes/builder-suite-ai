-- Rename existing manager column to construction_manager
ALTER TABLE projects RENAME COLUMN manager TO construction_manager;

-- Add new accounting_manager column
ALTER TABLE projects ADD COLUMN accounting_manager uuid;