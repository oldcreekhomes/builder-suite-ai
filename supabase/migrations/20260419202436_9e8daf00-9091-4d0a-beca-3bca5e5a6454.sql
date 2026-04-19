-- Create takeoff_project_profiles table
CREATE TABLE public.takeoff_project_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  takeoff_project_id UUID NOT NULL UNIQUE REFERENCES public.takeoff_projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,

  -- Square footage
  total_sf NUMERIC,
  heated_sf NUMERIC,
  unheated_sf NUMERIC,

  -- Rooms
  bedrooms INTEGER,
  full_baths INTEGER,
  half_baths INTEGER,
  stories INTEGER,

  -- Garage
  garage_bays INTEGER,
  garage_type TEXT, -- 'attached' | 'detached' | 'none'

  -- Basement
  basement_type TEXT, -- 'none' | 'unfinished' | 'finished'
  basement_sf NUMERIC,

  -- Construction
  foundation_type TEXT, -- 'slab' | 'crawl' | 'basement'
  roof_type TEXT,
  exterior_type TEXT,

  -- Footprint
  footprint_length NUMERIC,
  footprint_width NUMERIC,

  -- AI metadata
  ai_confidence JSONB,
  raw_extraction JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for lookups
CREATE INDEX idx_takeoff_project_profiles_takeoff_id ON public.takeoff_project_profiles(takeoff_project_id);
CREATE INDEX idx_takeoff_project_profiles_owner ON public.takeoff_project_profiles(owner_id);

-- Enable RLS
ALTER TABLE public.takeoff_project_profiles ENABLE ROW LEVEL SECURITY;

-- RLS: same-company access pattern (mirrors takeoff_projects)
CREATE POLICY "Users can view profiles in their company"
ON public.takeoff_project_profiles
FOR SELECT
TO authenticated
USING (
  public.users_in_same_company(auth.uid(), owner_id)
);

CREATE POLICY "Users can insert profiles in their company"
ON public.takeoff_project_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  public.users_in_same_company(auth.uid(), owner_id)
);

CREATE POLICY "Users can update profiles in their company"
ON public.takeoff_project_profiles
FOR UPDATE
TO authenticated
USING (
  public.users_in_same_company(auth.uid(), owner_id)
);

CREATE POLICY "Users can delete profiles in their company"
ON public.takeoff_project_profiles
FOR DELETE
TO authenticated
USING (
  public.users_in_same_company(auth.uid(), owner_id)
);

-- updated_at trigger
CREATE TRIGGER update_takeoff_project_profiles_updated_at
BEFORE UPDATE ON public.takeoff_project_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();