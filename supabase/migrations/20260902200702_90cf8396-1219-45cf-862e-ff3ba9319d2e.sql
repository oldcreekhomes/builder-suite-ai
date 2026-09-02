CREATE TABLE public.project_statement_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_psa_project ON public.project_statement_accounts(project_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_statement_accounts TO authenticated;
GRANT ALL ON public.project_statement_accounts TO service_role;

ALTER TABLE public.project_statement_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view statement accounts for their projects"
ON public.project_statement_accounts FOR SELECT TO authenticated
USING (
  project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  OR project_id IN (SELECT id FROM public.projects WHERE owner_id = (
    SELECT home_builder_id FROM public.users WHERE id = auth.uid() AND confirmed = true))
);

CREATE POLICY "Users can insert statement accounts for their projects"
ON public.project_statement_accounts FOR INSERT TO authenticated
WITH CHECK (
  project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  OR project_id IN (SELECT id FROM public.projects WHERE owner_id = (
    SELECT home_builder_id FROM public.users WHERE id = auth.uid() AND confirmed = true))
);

CREATE POLICY "Users can update statement accounts for their projects"
ON public.project_statement_accounts FOR UPDATE TO authenticated
USING (
  project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  OR project_id IN (SELECT id FROM public.projects WHERE owner_id = (
    SELECT home_builder_id FROM public.users WHERE id = auth.uid() AND confirmed = true))
);

CREATE POLICY "Users can delete statement accounts for their projects"
ON public.project_statement_accounts FOR DELETE TO authenticated
USING (
  project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  OR project_id IN (SELECT id FROM public.projects WHERE owner_id = (
    SELECT home_builder_id FROM public.users WHERE id = auth.uid() AND confirmed = true))
);

CREATE TRIGGER set_psa_audit_user
BEFORE INSERT OR UPDATE ON public.project_statement_accounts
FOR EACH ROW EXECUTE FUNCTION public.set_audit_user();

ALTER TABLE public.project_files
  ADD COLUMN statement_account_id uuid REFERENCES public.project_statement_accounts(id) ON DELETE SET NULL;