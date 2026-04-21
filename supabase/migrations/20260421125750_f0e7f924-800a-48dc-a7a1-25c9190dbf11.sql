ALTER TABLE public.pending_bill_uploads
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pending_bill_uploads_project_id
  ON public.pending_bill_uploads(project_id);