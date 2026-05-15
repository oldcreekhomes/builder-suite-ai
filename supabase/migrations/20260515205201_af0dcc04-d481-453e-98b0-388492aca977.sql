DELETE FROM public.journal_entry_lines
WHERE journal_entry_id IN (
  SELECT id
  FROM public.journal_entries
  WHERE id = 'b0d353fa-12ad-44be-8ee7-47ddc0592dd8'
    AND source_type = 'bill'
    AND source_id = '4012eabc-d168-462d-8cf6-1de7c92712cf'
);

DELETE FROM public.journal_entries
WHERE id = 'b0d353fa-12ad-44be-8ee7-47ddc0592dd8'
  AND source_type = 'bill'
  AND source_id = '4012eabc-d168-462d-8cf6-1de7c92712cf';

UPDATE public.bills
SET status = 'draft',
    updated_at = now()
WHERE id = '4012eabc-d168-462d-8cf6-1de7c92712cf'
  AND status = 'posted';