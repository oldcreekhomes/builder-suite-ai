
-- Add service_areas to companies
ALTER TABLE public.companies ADD COLUMN service_areas text[] DEFAULT '{}';

-- Add region to projects
ALTER TABLE public.projects ADD COLUMN region text;

-- Auto-populate companies based on state
UPDATE public.companies SET service_areas = ARRAY['Northern Virginia'] WHERE state IN ('VA', 'MD', 'DC') AND archived_at IS NULL;
UPDATE public.companies SET service_areas = ARRAY['Outer Banks, NC'] WHERE state = 'NC' AND archived_at IS NULL;

-- Auto-populate projects based on address
UPDATE public.projects SET region = 'Northern Virginia' WHERE address ILIKE '%VA%' OR address ILIKE '%Arlington%' OR address ILIKE '%Alexandria%' OR address ILIKE '%McLean%' OR address ILIKE '%Falls Church%' OR address ILIKE '%Lorton%' OR address ILIKE '%Fairfax%' OR address ILIKE '%Annandale%';
UPDATE public.projects SET region = 'Outer Banks, NC' WHERE address ILIKE '%NC%' OR address ILIKE '%Nags Head%' OR address ILIKE '%Outer Banks%';
