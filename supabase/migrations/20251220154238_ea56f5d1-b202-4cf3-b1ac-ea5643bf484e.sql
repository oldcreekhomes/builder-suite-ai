-- Add can_access_estimate column to user_notification_preferences
-- Default is false so employees won't have access by default
ALTER TABLE user_notification_preferences 
ADD COLUMN can_access_estimate BOOLEAN NOT NULL DEFAULT false;