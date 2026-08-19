WITH pay AS (
  SELECT pa.bill_id, MIN(bp.payment_date) AS pd, COUNT(DISTINCT bp.id) AS np
  FROM bill_payment_allocations pa
  JOIN bill_payments bp ON bp.id = pa.bill_payment_id
  WHERE bp.reversed_at IS NULL
  GROUP BY pa.bill_id
), je AS (
  SELECT source_id AS bill_id, COUNT(*) AS nj, (ARRAY_AGG(id))[1] AS je_id
  FROM journal_entries
  WHERE source_type = 'bill_payment'
  GROUP BY source_id
)
UPDATE journal_entries j
SET entry_date = pay.pd
FROM pay
JOIN je ON je.bill_id = pay.bill_id
WHERE j.id = je.je_id
  AND pay.np = 1
  AND je.nj = 1
  AND j.entry_date <> pay.pd;