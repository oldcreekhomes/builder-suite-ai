-- Backfill journal_entry_lines.reconciled/reconciliation_id/reconciliation_date
-- from legacy reconciled bills onto the matching bank-credit JE lines for
-- source_type = 'bill_payment'. Only updates lines that are currently
-- missing reconciliation data. Does not touch checks/deposits/manuals.
UPDATE public.journal_entry_lines AS jel
SET
  reconciled = true,
  reconciliation_id = b.reconciliation_id,
  reconciliation_date = b.reconciliation_date
FROM public.journal_entries je
JOIN public.bills b ON b.id = je.source_id
JOIN public.bank_reconciliations br ON br.id = b.reconciliation_id
WHERE jel.journal_entry_id = je.id
  AND je.source_type = 'bill_payment'
  AND je.is_reversal = false
  AND je.reversed_at IS NULL
  AND COALESCE(jel.credit, 0) > 0
  AND jel.account_id = br.bank_account_id
  AND (jel.project_id = br.project_id OR (jel.project_id IS NULL AND br.project_id IS NULL))
  AND b.reconciled = true
  AND b.reconciliation_id IS NOT NULL
  AND jel.reconciled = false
  AND jel.reconciliation_id IS NULL;