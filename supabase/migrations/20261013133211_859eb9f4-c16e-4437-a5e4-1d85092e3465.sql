CREATE TABLE public.bank_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  plaid_item_id text NOT NULL,
  plaid_account_id text NOT NULL,
  access_token text NOT NULL,
  institution_name text,
  account_mask text,
  account_label text,
  current_balance numeric,
  available_balance numeric,
  last_synced_at timestamptz,
  last_error text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, account_id)
);

GRANT SELECT (id, owner_id, project_id, account_id, institution_name, account_mask, account_label,
  current_balance, available_balance, last_synced_at, last_error, created_at, updated_at)
  ON public.bank_connections TO authenticated;
GRANT ALL ON public.bank_connections TO service_role;

ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view bank connections"
ON public.bank_connections FOR SELECT TO authenticated
USING (owner_id = auth.uid() OR owner_id = public.get_current_user_home_builder_id());