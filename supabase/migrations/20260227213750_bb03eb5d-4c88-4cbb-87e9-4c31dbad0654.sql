-- Add allowed_service_areas column to marketplace_subscriptions
ALTER TABLE marketplace_subscriptions 
ADD COLUMN IF NOT EXISTS allowed_service_areas text[] DEFAULT ARRAY['Washington, DC'];
