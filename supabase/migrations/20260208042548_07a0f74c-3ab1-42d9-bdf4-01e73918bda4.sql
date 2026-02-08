-- Add HQ address fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS hq_address TEXT,
ADD COLUMN IF NOT EXISTS hq_city TEXT,
ADD COLUMN IF NOT EXISTS hq_state TEXT,
ADD COLUMN IF NOT EXISTS hq_zip TEXT,
ADD COLUMN IF NOT EXISTS hq_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS hq_lng DOUBLE PRECISION;

-- Add lat/lng to marketplace_companies for distance calculations
ALTER TABLE public.marketplace_companies
ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- Create marketplace subscriptions table for tier tracking
CREATE TABLE public.marketplace_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  max_radius_miles INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id)
);

-- Enable RLS
ALTER TABLE public.marketplace_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users can view own subscription"
ON public.marketplace_subscriptions FOR SELECT
USING (owner_id = auth.uid());

-- Users can insert their own subscription (for initial free tier creation)
CREATE POLICY "Users can create own subscription"
ON public.marketplace_subscriptions FOR INSERT
WITH CHECK (owner_id = auth.uid());

-- Haversine distance function for fast server-side filtering
CREATE OR REPLACE FUNCTION public.calculate_distance_miles(
  lat1 DOUBLE PRECISION, lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lng2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
  SELECT CASE 
    WHEN lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN NULL
    ELSE 3959 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(lat1)) * cos(radians(lat2)) * 
        cos(radians(lng2) - radians(lng1)) + 
        sin(radians(lat1)) * sin(radians(lat2))
      ))
    )
  END;
$$ LANGUAGE SQL IMMUTABLE;

-- Trigger for updated_at on marketplace_subscriptions
CREATE TRIGGER update_marketplace_subscriptions_updated_at
  BEFORE UPDATE ON public.marketplace_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();