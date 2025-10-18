-- Create takeoff projects table
CREATE TABLE IF NOT EXISTS public.takeoff_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create takeoff sheets table (individual plan pages)
CREATE TABLE IF NOT EXISTS public.takeoff_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  takeoff_project_id UUID REFERENCES public.takeoff_projects(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  drawing_scale TEXT,
  scale_ratio NUMERIC,
  page_number INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create takeoff items table (measured quantities)
CREATE TABLE IF NOT EXISTS public.takeoff_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  takeoff_sheet_id UUID REFERENCES public.takeoff_sheets(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('count', 'length', 'area', 'volume')),
  category TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit_of_measure TEXT,
  unit_price NUMERIC,
  total_cost NUMERIC GENERATED ALWAYS AS (quantity * COALESCE(unit_price, 0)) STORED,
  cost_code_id UUID REFERENCES public.cost_codes(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create takeoff annotations table (canvas drawings)
CREATE TABLE IF NOT EXISTS public.takeoff_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  takeoff_sheet_id UUID REFERENCES public.takeoff_sheets(id) ON DELETE CASCADE NOT NULL,
  takeoff_item_id UUID REFERENCES public.takeoff_items(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  annotation_type TEXT NOT NULL CHECK (annotation_type IN ('point', 'line', 'rectangle', 'polygon', 'circle')),
  geometry JSONB NOT NULL,
  color TEXT DEFAULT '#FF0000',
  label TEXT,
  layer_name TEXT DEFAULT 'default',
  visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.takeoff_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.takeoff_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.takeoff_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.takeoff_annotations ENABLE ROW LEVEL SECURITY;

-- RLS policies for takeoff_projects
CREATE POLICY "Takeoff projects visible to owner and confirmed employees"
  ON public.takeoff_projects FOR SELECT
  USING (
    owner_id = auth.uid() OR 
    owner_id IN (
      SELECT home_builder_id FROM public.users 
      WHERE id = auth.uid() AND confirmed = true AND role = ANY(ARRAY['employee', 'accountant'])
    )
  );

CREATE POLICY "Takeoff projects insert limited to owner and confirmed employees"
  ON public.takeoff_projects FOR INSERT
  WITH CHECK (
    owner_id = auth.uid() OR 
    owner_id IN (
      SELECT home_builder_id FROM public.users 
      WHERE id = auth.uid() AND confirmed = true AND role = ANY(ARRAY['employee', 'accountant'])
    )
  );

CREATE POLICY "Takeoff projects update limited to owner and confirmed employees"
  ON public.takeoff_projects FOR UPDATE
  USING (
    owner_id = auth.uid() OR 
    owner_id IN (
      SELECT home_builder_id FROM public.users 
      WHERE id = auth.uid() AND confirmed = true AND role = ANY(ARRAY['employee', 'accountant'])
    )
  );

CREATE POLICY "Takeoff projects delete limited to owner and confirmed employees"
  ON public.takeoff_projects FOR DELETE
  USING (
    owner_id = auth.uid() OR 
    owner_id IN (
      SELECT home_builder_id FROM public.users 
      WHERE id = auth.uid() AND confirmed = true AND role = ANY(ARRAY['employee', 'accountant'])
    )
  );

-- RLS policies for takeoff_sheets
CREATE POLICY "Takeoff sheets visible to owner and confirmed employees"
  ON public.takeoff_sheets FOR SELECT
  USING (
    owner_id = auth.uid() OR 
    owner_id IN (
      SELECT home_builder_id FROM public.users 
      WHERE id = auth.uid() AND confirmed = true AND role = ANY(ARRAY['employee', 'accountant'])
    )
  );

CREATE POLICY "Takeoff sheets insert limited to owner and confirmed employees"
  ON public.takeoff_sheets FOR INSERT
  WITH CHECK (
    owner_id = auth.uid() OR 
    owner_id IN (
      SELECT home_builder_id FROM public.users 
      WHERE id = auth.uid() AND confirmed = true AND role = ANY(ARRAY['employee', 'accountant'])
    )
  );

CREATE POLICY "Takeoff sheets update limited to owner and confirmed employees"
  ON public.takeoff_sheets FOR UPDATE
  USING (
    owner_id = auth.uid() OR 
    owner_id IN (
      SELECT home_builder_id FROM public.users 
      WHERE id = auth.uid() AND confirmed = true AND role = ANY(ARRAY['employee', 'accountant'])
    )
  );

CREATE POLICY "Takeoff sheets delete limited to owner and confirmed employees"
  ON public.takeoff_sheets FOR DELETE
  USING (
    owner_id = auth.uid() OR 
    owner_id IN (
      SELECT home_builder_id FROM public.users 
      WHERE id = auth.uid() AND confirmed = true AND role = ANY(ARRAY['employee', 'accountant'])
    )
  );

-- RLS policies for takeoff_items
CREATE POLICY "Takeoff items visible to owner and confirmed employees"
  ON public.takeoff_items FOR SELECT
  USING (
    owner_id = auth.uid() OR 
    owner_id IN (
      SELECT home_builder_id FROM public.users 
      WHERE id = auth.uid() AND confirmed = true AND role = ANY(ARRAY['employee', 'accountant'])
    )
  );

CREATE POLICY "Takeoff items insert limited to owner and confirmed employees"
  ON public.takeoff_items FOR INSERT
  WITH CHECK (
    owner_id = auth.uid() OR 
    owner_id IN (
      SELECT home_builder_id FROM public.users 
      WHERE id = auth.uid() AND confirmed = true AND role = ANY(ARRAY['employee', 'accountant'])
    )
  );

CREATE POLICY "Takeoff items update limited to owner and confirmed employees"
  ON public.takeoff_items FOR UPDATE
  USING (
    owner_id = auth.uid() OR 
    owner_id IN (
      SELECT home_builder_id FROM public.users 
      WHERE id = auth.uid() AND confirmed = true AND role = ANY(ARRAY['employee', 'accountant'])
    )
  );

CREATE POLICY "Takeoff items delete limited to owner and confirmed employees"
  ON public.takeoff_items FOR DELETE
  USING (
    owner_id = auth.uid() OR 
    owner_id IN (
      SELECT home_builder_id FROM public.users 
      WHERE id = auth.uid() AND confirmed = true AND role = ANY(ARRAY['employee', 'accountant'])
    )
  );

-- RLS policies for takeoff_annotations
CREATE POLICY "Takeoff annotations visible to owner and confirmed employees"
  ON public.takeoff_annotations FOR SELECT
  USING (
    owner_id = auth.uid() OR 
    owner_id IN (
      SELECT home_builder_id FROM public.users 
      WHERE id = auth.uid() AND confirmed = true AND role = ANY(ARRAY['employee', 'accountant'])
    )
  );

CREATE POLICY "Takeoff annotations insert limited to owner and confirmed employees"
  ON public.takeoff_annotations FOR INSERT
  WITH CHECK (
    owner_id = auth.uid() OR 
    owner_id IN (
      SELECT home_builder_id FROM public.users 
      WHERE id = auth.uid() AND confirmed = true AND role = ANY(ARRAY['employee', 'accountant'])
    )
  );

CREATE POLICY "Takeoff annotations update limited to owner and confirmed employees"
  ON public.takeoff_annotations FOR UPDATE
  USING (
    owner_id = auth.uid() OR 
    owner_id IN (
      SELECT home_builder_id FROM public.users 
      WHERE id = auth.uid() AND confirmed = true AND role = ANY(ARRAY['employee', 'accountant'])
    )
  );

CREATE POLICY "Takeoff annotations delete limited to owner and confirmed employees"
  ON public.takeoff_annotations FOR DELETE
  USING (
    owner_id = auth.uid() OR 
    owner_id IN (
      SELECT home_builder_id FROM public.users 
      WHERE id = auth.uid() AND confirmed = true AND role = ANY(ARRAY['employee', 'accountant'])
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_takeoff_sheets_project_id ON public.takeoff_sheets(takeoff_project_id);
CREATE INDEX IF NOT EXISTS idx_takeoff_items_sheet_id ON public.takeoff_items(takeoff_sheet_id);
CREATE INDEX IF NOT EXISTS idx_takeoff_annotations_sheet_id ON public.takeoff_annotations(takeoff_sheet_id);
CREATE INDEX IF NOT EXISTS idx_takeoff_items_cost_code_id ON public.takeoff_items(cost_code_id);
CREATE INDEX IF NOT EXISTS idx_takeoff_projects_project_id ON public.takeoff_projects(project_id);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_takeoff_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_takeoff_sheets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_takeoff_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_takeoff_annotations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_takeoff_projects_updated_at
  BEFORE UPDATE ON public.takeoff_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_takeoff_projects_updated_at();

CREATE TRIGGER update_takeoff_sheets_updated_at
  BEFORE UPDATE ON public.takeoff_sheets
  FOR EACH ROW EXECUTE FUNCTION public.update_takeoff_sheets_updated_at();

CREATE TRIGGER update_takeoff_items_updated_at
  BEFORE UPDATE ON public.takeoff_items
  FOR EACH ROW EXECUTE FUNCTION public.update_takeoff_items_updated_at();

CREATE TRIGGER update_takeoff_annotations_updated_at
  BEFORE UPDATE ON public.takeoff_annotations
  FOR EACH ROW EXECUTE FUNCTION public.update_takeoff_annotations_updated_at();