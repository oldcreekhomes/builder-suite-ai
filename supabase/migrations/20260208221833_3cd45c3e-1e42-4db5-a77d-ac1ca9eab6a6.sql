-- Create marketplace_distance_cache table for permanent distance caching
CREATE TABLE public.marketplace_distance_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_lat DECIMAL(10, 7) NOT NULL,
  origin_lng DECIMAL(10, 7) NOT NULL,
  origin_address TEXT NOT NULL,
  company_id UUID REFERENCES public.marketplace_companies(id) ON DELETE CASCADE,
  distance_miles DECIMAL(8, 2),
  calculated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(origin_lat, origin_lng, company_id)
);

-- Create indexes for fast lookups
CREATE INDEX idx_distance_cache_origin ON public.marketplace_distance_cache(origin_lat, origin_lng);
CREATE INDEX idx_distance_cache_company ON public.marketplace_distance_cache(company_id);
CREATE INDEX idx_distance_cache_calculated ON public.marketplace_distance_cache(calculated_at);

-- Enable RLS
ALTER TABLE public.marketplace_distance_cache ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read cached distances
CREATE POLICY "Authenticated users can read distance cache"
ON public.marketplace_distance_cache
FOR SELECT
TO authenticated
USING (true);

-- Allow service role to insert/update cache
CREATE POLICY "Service role can manage distance cache"
ON public.marketplace_distance_cache
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Comment explaining the table
COMMENT ON TABLE public.marketplace_distance_cache IS 'Permanent cache for marketplace company distances to prevent repeated Google Distance Matrix API calls';