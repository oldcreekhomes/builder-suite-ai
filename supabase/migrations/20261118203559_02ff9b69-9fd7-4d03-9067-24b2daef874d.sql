CREATE OR REPLACE FUNCTION public.guard_bill_paid_on_reversal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE live numeric;
BEGIN
  IF NEW.total_amount <= 0 OR NEW.status IN ('reversed','void','draft') THEN RETURN NEW; END IF;
  -- Only act when a payment for this bill is being reversed in this same transaction
  IF NOT EXISTS (
    SELECT 1 FROM journal_entries j
    WHERE j.source_type = 'bill_payment' AND j.source_id = NEW.id AND j.reversed_at = now()
  ) THEN RETURN NEW; END IF;
  SELECT COALESCE(ROUND(SUM(l.debit)::numeric,2),0) INTO live
  FROM journal_entries j
  JOIN journal_entry_lines l ON l.journal_entry_id = j.id
  JOIN accounts a ON a.id = l.account_id
  WHERE j.source_type = 'bill_payment' AND j.source_id = NEW.id
    AND j.reversed_at IS NULL AND COALESCE(j.is_reversal,false) = false
    AND a.type = 'liability' AND l.debit > 0;
  live := LEAST(live, ROUND(NEW.total_amount::numeric,2));
  IF live > COALESCE(NEW.amount_paid,0) THEN
    NEW.amount_paid := live;
    IF live >= ROUND(NEW.total_amount::numeric,2) THEN NEW.status := 'paid'; END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.guard_bill_paid_on_reversal() FROM PUBLIC, anon, authenticated;