-- Fix orphaned open periods that have later closed periods
-- Sept 30 for project 67e55b12 (412 E Nelson) - has Oct 31 and Jan 31 closed
UPDATE public.accounting_periods 
SET status = 'closed', 
    closed_at = now(), 
    closure_notes = 'Auto-closed: later period already closed'
WHERE status = 'open'
  AND id IN (
    SELECT ap1.id 
    FROM public.accounting_periods ap1
    WHERE ap1.status = 'open'
      AND EXISTS (
        SELECT 1 FROM public.accounting_periods ap2
        WHERE ap2.project_id = ap1.project_id
          AND ap2.owner_id = ap1.owner_id
          AND ap2.status = 'closed'
          AND ap2.period_end_date > ap1.period_end_date
      )
  );