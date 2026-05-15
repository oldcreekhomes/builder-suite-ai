
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS is_linearized boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS linearize_error text;

CREATE INDEX IF NOT EXISTS idx_project_files_pending_linearize
  ON public.project_files (is_linearized)
  WHERE is_linearized = false AND is_deleted = false;
