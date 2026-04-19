-- 1) Extend profile with verbatim area schedule + roof pitches
ALTER TABLE public.takeoff_project_profiles
  ADD COLUMN IF NOT EXISTS area_schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS roof_pitches jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2) New estimate items table
CREATE TABLE IF NOT EXISTS public.takeoff_project_estimate_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  takeoff_project_id uuid NOT NULL REFERENCES public.takeoff_projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  cost_code_id uuid REFERENCES public.cost_codes(id) ON DELETE SET NULL,
  cost_code_label text,
  item_label text,
  size text,
  quantity numeric,
  unit text DEFAULT 'EA',
  spec jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_sheet text,
  confidence text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tpei_takeoff_project_id
  ON public.takeoff_project_estimate_items(takeoff_project_id);
CREATE INDEX IF NOT EXISTS idx_tpei_cost_code_id
  ON public.takeoff_project_estimate_items(cost_code_id);

ALTER TABLE public.takeoff_project_estimate_items ENABLE ROW LEVEL SECURITY;

-- RLS mirroring takeoff_projects: owner OR same home_builder employee
CREATE POLICY "tpei_select_same_company"
ON public.takeoff_project_estimate_items
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR owner_id = public.get_current_user_home_builder_id()
);

CREATE POLICY "tpei_insert_same_company"
ON public.takeoff_project_estimate_items
FOR INSERT
TO authenticated
WITH CHECK (
  owner_id = auth.uid()
  OR owner_id = public.get_current_user_home_builder_id()
);

CREATE POLICY "tpei_update_same_company"
ON public.takeoff_project_estimate_items
FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid()
  OR owner_id = public.get_current_user_home_builder_id()
)
WITH CHECK (
  owner_id = auth.uid()
  OR owner_id = public.get_current_user_home_builder_id()
);

CREATE POLICY "tpei_delete_same_company"
ON public.takeoff_project_estimate_items
FOR DELETE
TO authenticated
USING (
  owner_id = auth.uid()
  OR owner_id = public.get_current_user_home_builder_id()
);

CREATE TRIGGER trg_tpei_updated_at
BEFORE UPDATE ON public.takeoff_project_estimate_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();