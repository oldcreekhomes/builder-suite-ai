CREATE TABLE public.project_default_deposit_accounts (
  project_id uuid NOT NULL PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_default_deposit_accounts TO authenticated;
GRANT ALL ON public.project_default_deposit_accounts TO service_role;

ALTER TABLE public.project_default_deposit_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view project default deposit accounts for their projects"
ON public.project_default_deposit_accounts FOR SELECT
USING (
  project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  OR project_id IN (
    SELECT id FROM public.projects WHERE owner_id = (
      SELECT home_builder_id FROM public.users WHERE id = auth.uid() AND role = 'employee' AND confirmed = true
    )
  )
);

CREATE POLICY "Users can insert project default deposit accounts for their projects"
ON public.project_default_deposit_accounts FOR INSERT
WITH CHECK (
  project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  OR project_id IN (
    SELECT id FROM public.projects WHERE owner_id = (
      SELECT home_builder_id FROM public.users WHERE id = auth.uid() AND role = 'employee' AND confirmed = true
    )
  )
);

CREATE POLICY "Users can update project default deposit accounts for their projects"
ON public.project_default_deposit_accounts FOR UPDATE
USING (
  project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  OR project_id IN (
    SELECT id FROM public.projects WHERE owner_id = (
      SELECT home_builder_id FROM public.users WHERE id = auth.uid() AND role = 'employee' AND confirmed = true
    )
  )
);

CREATE POLICY "Users can delete project default deposit accounts for their projects"
ON public.project_default_deposit_accounts FOR DELETE
USING (
  project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  OR project_id IN (
    SELECT id FROM public.projects WHERE owner_id = (
      SELECT home_builder_id FROM public.users WHERE id = auth.uid() AND role = 'employee' AND confirmed = true
    )
  )
);

-- Seed initial values from existing project default bank so users don't lose current behavior
INSERT INTO public.project_default_deposit_accounts (project_id, account_id)
SELECT project_id, account_id FROM public.project_default_bank_accounts
ON CONFLICT (project_id) DO NOTHING;