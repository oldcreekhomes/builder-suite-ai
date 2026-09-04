ALTER TABLE public.recurring_transactions
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;

UPDATE public.recurring_transactions
SET project_id = (template_data->>'project_id')::uuid
WHERE project_id IS NULL
  AND template_data->>'project_id' IS NOT NULL
  AND (template_data->>'project_id') <> ''
  AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = (template_data->>'project_id')::uuid);

CREATE INDEX IF NOT EXISTS idx_recurring_transactions_owner_project
  ON public.recurring_transactions (owner_id, project_id);

DROP POLICY IF EXISTS "Users can view own recurring transactions" ON public.recurring_transactions;
DROP POLICY IF EXISTS "Users can create own recurring transactions" ON public.recurring_transactions;
DROP POLICY IF EXISTS "Users can update own recurring transactions" ON public.recurring_transactions;
DROP POLICY IF EXISTS "Users can delete own recurring transactions" ON public.recurring_transactions;

CREATE POLICY "Users can view own recurring transactions"
  ON public.recurring_transactions FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR owner_id = public.get_current_user_home_builder_id());
CREATE POLICY "Users can create own recurring transactions"
  ON public.recurring_transactions FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR owner_id = public.get_current_user_home_builder_id());
CREATE POLICY "Users can update own recurring transactions"
  ON public.recurring_transactions FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR owner_id = public.get_current_user_home_builder_id())
  WITH CHECK (owner_id = auth.uid() OR owner_id = public.get_current_user_home_builder_id());
CREATE POLICY "Users can delete own recurring transactions"
  ON public.recurring_transactions FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR owner_id = public.get_current_user_home_builder_id());

DROP POLICY IF EXISTS "Users can view own recurring transaction lines" ON public.recurring_transaction_lines;
DROP POLICY IF EXISTS "Users can create own recurring transaction lines" ON public.recurring_transaction_lines;
DROP POLICY IF EXISTS "Users can update own recurring transaction lines" ON public.recurring_transaction_lines;
DROP POLICY IF EXISTS "Users can delete own recurring transaction lines" ON public.recurring_transaction_lines;

CREATE POLICY "Users can view own recurring transaction lines"
  ON public.recurring_transaction_lines FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR owner_id = public.get_current_user_home_builder_id());
CREATE POLICY "Users can create own recurring transaction lines"
  ON public.recurring_transaction_lines FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR owner_id = public.get_current_user_home_builder_id());
CREATE POLICY "Users can update own recurring transaction lines"
  ON public.recurring_transaction_lines FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR owner_id = public.get_current_user_home_builder_id())
  WITH CHECK (owner_id = auth.uid() OR owner_id = public.get_current_user_home_builder_id());
CREATE POLICY "Users can delete own recurring transaction lines"
  ON public.recurring_transaction_lines FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR owner_id = public.get_current_user_home_builder_id());