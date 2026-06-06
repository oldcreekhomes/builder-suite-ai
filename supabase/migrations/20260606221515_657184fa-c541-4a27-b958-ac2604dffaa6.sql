
-- Per-project default bank account override
CREATE TABLE public.project_default_bank_accounts (
  project_id uuid NOT NULL PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_default_bank_accounts TO authenticated;
GRANT ALL ON public.project_default_bank_accounts TO service_role;

ALTER TABLE public.project_default_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view project default banks for their projects"
ON public.project_default_bank_accounts FOR SELECT
USING (
  project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  OR project_id IN (
    SELECT id FROM public.projects WHERE owner_id = (
      SELECT home_builder_id FROM public.users WHERE id = auth.uid() AND role = 'employee' AND confirmed = true
    )
  )
);

CREATE POLICY "Users can insert project default banks for their projects"
ON public.project_default_bank_accounts FOR INSERT
WITH CHECK (
  project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  OR project_id IN (
    SELECT id FROM public.projects WHERE owner_id = (
      SELECT home_builder_id FROM public.users WHERE id = auth.uid() AND role = 'employee' AND confirmed = true
    )
  )
);

CREATE POLICY "Users can update project default banks for their projects"
ON public.project_default_bank_accounts FOR UPDATE
USING (
  project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  OR project_id IN (
    SELECT id FROM public.projects WHERE owner_id = (
      SELECT home_builder_id FROM public.users WHERE id = auth.uid() AND role = 'employee' AND confirmed = true
    )
  )
);

CREATE POLICY "Users can delete project default banks for their projects"
ON public.project_default_bank_accounts FOR DELETE
USING (
  project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  OR project_id IN (
    SELECT id FROM public.projects WHERE owner_id = (
      SELECT home_builder_id FROM public.users WHERE id = auth.uid() AND role = 'employee' AND confirmed = true
    )
  )
);

-- Auto-seed new projects with the tenant's current global default bank
CREATE OR REPLACE FUNCTION public.seed_project_default_bank_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_default_account_id uuid;
BEGIN
  SELECT id INTO v_default_account_id
  FROM public.accounts
  WHERE owner_id = NEW.owner_id
    AND is_default_bank = true
  LIMIT 1;

  IF v_default_account_id IS NOT NULL THEN
    INSERT INTO public.project_default_bank_accounts (project_id, account_id)
    VALUES (NEW.id, v_default_account_id)
    ON CONFLICT (project_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_project_default_bank_account ON public.projects;
CREATE TRIGGER trg_seed_project_default_bank_account
AFTER INSERT ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.seed_project_default_bank_account();
