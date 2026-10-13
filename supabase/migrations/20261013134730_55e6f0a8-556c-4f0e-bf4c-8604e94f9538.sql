DROP TABLE IF EXISTS public.bank_connections;

CREATE TABLE public.bank_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  plaid_item_id text NOT NULL UNIQUE,
  access_token text NOT NULL,
  institution_name text,
  last_synced_at timestamptz,
  last_error text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT (id, owner_id, institution_name, last_synced_at, last_error, created_at, updated_at)
  ON public.bank_connections TO authenticated;
GRANT ALL ON public.bank_connections TO service_role;
ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can view bank connections"
ON public.bank_connections FOR SELECT TO authenticated
USING (owner_id = auth.uid() OR owner_id = public.get_current_user_home_builder_id());

CREATE TABLE public.bank_connection_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.bank_connections(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  plaid_account_id text NOT NULL UNIQUE,
  name text,
  mask text,
  current_balance numeric,
  available_balance numeric,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX bank_connection_accounts_job_uidx
  ON public.bank_connection_accounts(project_id, account_id) WHERE project_id IS NOT NULL;
GRANT SELECT ON public.bank_connection_accounts TO authenticated;
GRANT ALL ON public.bank_connection_accounts TO service_role;
ALTER TABLE public.bank_connection_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can view bank accounts"
ON public.bank_connection_accounts FOR SELECT TO authenticated
USING (owner_id = auth.uid() OR owner_id = public.get_current_user_home_builder_id());