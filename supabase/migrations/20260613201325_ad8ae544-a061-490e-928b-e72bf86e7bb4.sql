
CREATE TABLE public.project_account_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  UNIQUE (project_id, account_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_account_overrides TO authenticated;
GRANT ALL ON public.project_account_overrides TO service_role;

ALTER TABLE public.project_account_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view overrides for their projects"
  ON public.project_account_overrides FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
    )
    OR project_id IN (
      SELECT id FROM public.projects
      WHERE owner_id = (
        SELECT home_builder_id FROM public.users
        WHERE id = auth.uid() AND confirmed = true
      )
    )
  );

CREATE POLICY "Users can insert overrides for their projects"
  ON public.project_account_overrides FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
    )
    OR project_id IN (
      SELECT id FROM public.projects
      WHERE owner_id = (
        SELECT home_builder_id FROM public.users
        WHERE id = auth.uid() AND confirmed = true
      )
    )
  );

CREATE POLICY "Users can update overrides for their projects"
  ON public.project_account_overrides FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
    )
    OR project_id IN (
      SELECT id FROM public.projects
      WHERE owner_id = (
        SELECT home_builder_id FROM public.users
        WHERE id = auth.uid() AND confirmed = true
      )
    )
  );

CREATE POLICY "Users can delete overrides for their projects"
  ON public.project_account_overrides FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
    )
    OR project_id IN (
      SELECT id FROM public.projects
      WHERE owner_id = (
        SELECT home_builder_id FROM public.users
        WHERE id = auth.uid() AND confirmed = true
      )
    )
  );

CREATE TRIGGER set_audit_user_project_account_overrides
  BEFORE INSERT OR UPDATE ON public.project_account_overrides
  FOR EACH ROW EXECUTE FUNCTION public.set_audit_user();

CREATE TRIGGER update_project_account_overrides_updated_at
  BEFORE UPDATE ON public.project_account_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
