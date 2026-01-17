-- Remove unused account_number and routing_number columns from checks table
-- These columns only contain placeholder test data and are not used in the UI
ALTER TABLE checks DROP COLUMN IF EXISTS account_number;
ALTER TABLE checks DROP COLUMN IF EXISTS routing_number;