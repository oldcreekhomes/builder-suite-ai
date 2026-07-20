CREATE OR REPLACE FUNCTION public.enforce_journal_entry_reversal_pair()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.reversed_at IS NOT NULL AND NEW.reversed_by_id IS NULL THEN
    RAISE EXCEPTION 'A journal entry cannot have a reversal date without a reversing entry link';
  END IF;

  IF NEW.reversed_by_id IS NOT NULL AND NEW.reversed_at IS NULL THEN
    NEW.reversed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_journal_entry_reversal_pair_trigger ON public.journal_entries;

CREATE TRIGGER enforce_journal_entry_reversal_pair_trigger
BEFORE INSERT OR UPDATE OF reversed_at, reversed_by_id
ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.enforce_journal_entry_reversal_pair();