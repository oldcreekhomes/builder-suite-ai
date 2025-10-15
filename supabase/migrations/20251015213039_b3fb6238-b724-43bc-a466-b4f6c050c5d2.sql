-- Add receive_bill_payment_alerts to user_notification_preferences
ALTER TABLE user_notification_preferences 
ADD COLUMN IF NOT EXISTS receive_bill_payment_alerts boolean NOT NULL DEFAULT false;