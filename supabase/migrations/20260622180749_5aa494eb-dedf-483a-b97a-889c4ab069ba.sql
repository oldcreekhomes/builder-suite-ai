ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS project_id uuid NULL REFERENCES public.projects(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS accounts_owner_project_idx
  ON public.accounts (owner_id, project_id);