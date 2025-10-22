-- Add new access permission columns to user_notification_preferences
-- Default to true to maintain current behavior (everyone has access)
ALTER TABLE user_notification_preferences
ADD COLUMN IF NOT EXISTS can_access_accounting boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS can_access_manage_bills boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS can_access_transactions boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS can_access_reports boolean NOT NULL DEFAULT true;