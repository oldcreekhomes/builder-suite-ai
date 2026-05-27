-- Backfill legacy bill notes for Matt Gray that have no date stamp.
-- Convert "Matt Gray: ..." and "Matt Gray (Resent for Review): ..." blocks
-- into "Matt Gray | MM/DD/YYYY: ..." using the bill's updated_at date.
UPDATE public.bills
SET notes = regexp_replace(
  notes,
  '(^|\n\n)Matt Gray( \(Resent for Review\))?: ',
  '\1Matt Gray\2 | ' || to_char((updated_at AT TIME ZONE 'America/Chicago')::date, 'MM/DD/YYYY') || ': ',
  'g'
)
WHERE notes ~ '(^|\n\n)Matt Gray( \(Resent for Review\))?: ';