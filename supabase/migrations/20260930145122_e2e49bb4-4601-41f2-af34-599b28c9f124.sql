CREATE OR REPLACE FUNCTION public.get_project_cash_position(p_days integer)
RETURNS TABLE(project_id uuid, address text, account_id uuid, account_code text, account_name text, bank_balance numeric, approved_due numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH t AS (SELECT public.get_caller_tenant_id() AS tid),
  def AS (
    SELECT a.id FROM public.accounts a, t
    WHERE a.owner_id = t.tid AND a.subtype = 'bank' AND COALESCE(a.is_active, true)
    ORDER BY COALESCE(a.is_default_bank,false) DESC, a.code LIMIT 1
  ),
  p AS (
    SELECT pr.id, pr.address,
      COALESCE((SELECT pdba.account_id FROM public.project_default_bank_accounts pdba WHERE pdba.project_id = pr.id LIMIT 1), (SELECT id FROM def)) AS acct
    FROM public.projects pr, t
    WHERE pr.owner_id = t.tid
      AND COALESCE(pr.status,'') NOT IN ('Completed','Permanently Closed')
  )
  SELECT p.id, p.address, a.id, a.code, a.name,
    COALESCE((SELECT SUM(jel.debit - jel.credit) FROM public.journal_entry_lines jel
              WHERE jel.account_id = p.acct AND jel.project_id = p.id), 0)::numeric,
    COALESCE((SELECT SUM(GREATEST(b.total_amount - COALESCE(b.amount_paid,0),0)) FROM public.bills b
              WHERE b.project_id = p.id AND b.status = 'posted' AND b.archived_at IS NULL
                AND b.due_date IS NOT NULL AND b.due_date <= CURRENT_DATE + p_days), 0)::numeric
  FROM p LEFT JOIN public.accounts a ON a.id = p.acct
  ORDER BY p.address;
$$;
GRANT EXECUTE ON FUNCTION public.get_project_cash_position(integer) TO authenticated;