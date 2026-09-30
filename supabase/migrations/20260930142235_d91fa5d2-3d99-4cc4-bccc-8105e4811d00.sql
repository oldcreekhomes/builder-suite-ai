
CREATE OR REPLACE FUNCTION public.get_bank_account_balances()
RETURNS TABLE(account_id uuid, code text, name text, is_default_bank boolean, balance numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id,
         a.code,
         a.name,
         COALESCE(a.is_default_bank, false),
         COALESCE(SUM(jel.debit - jel.credit), 0)::numeric
  FROM public.accounts a
  LEFT JOIN public.journal_entry_lines jel ON jel.account_id = a.id
  WHERE a.owner_id = public.get_caller_tenant_id()
    AND a.subtype = 'bank'
    AND COALESCE(a.is_active, true)
  GROUP BY a.id, a.code, a.name, a.is_default_bank
  ORDER BY a.code;
$$;

CREATE OR REPLACE FUNCTION public.get_approved_bills_due(p_days integer)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(GREATEST(b.total_amount - COALESCE(b.amount_paid, 0), 0)), 0)::numeric
  FROM public.bills b
  WHERE b.owner_id = public.get_caller_tenant_id()
    AND b.status = 'posted'
    AND b.archived_at IS NULL
    AND b.due_date IS NOT NULL
    AND b.due_date <= (CURRENT_DATE + p_days);
$$;

GRANT EXECUTE ON FUNCTION public.get_bank_account_balances() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_approved_bills_due(integer) TO authenticated;
