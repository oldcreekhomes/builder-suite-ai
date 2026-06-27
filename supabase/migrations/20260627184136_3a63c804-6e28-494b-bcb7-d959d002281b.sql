
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS pending_removal_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_users_pending_removal_at
  ON public.users (pending_removal_at)
  WHERE pending_removal_at IS NOT NULL;
