-- Backfill missing bill_payments + bill_payment_allocations for every
-- 'bill_payment' journal entry that has no matching consolidated payment record.
-- Skips reversed JEs and pure credit-application JEs (those already have rows).

WITH ap AS (
  SELECT owner_id, ap_account_id
  FROM accounting_settings
  WHERE ap_account_id IS NOT NULL
),
orphan_jes AS (
  SELECT je.id AS je_id, je.entry_date, je.source_id AS bill_id,
         je.owner_id, je.created_by
  FROM journal_entries je
  WHERE je.source_type = 'bill_payment'
    AND COALESCE(je.is_reversal, false) = false
    AND je.reversed_at IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM bill_payment_allocations bpa
      JOIN bill_payments bp ON bp.id = bpa.bill_payment_id
      WHERE bpa.bill_id = je.source_id
        AND bp.payment_date = je.entry_date
    )
),
agg AS (
  SELECT o.je_id, o.entry_date, o.bill_id, o.owner_id, o.created_by,
         b.vendor_id, b.project_id,
         SUM(CASE WHEN jel.account_id = ap.ap_account_id THEN jel.debit ELSE 0 END) AS amount,
         (array_agg(jel.account_id) FILTER (
            WHERE jel.account_id <> ap.ap_account_id AND jel.credit > 0
         ))[1] AS cash_account_id
  FROM orphan_jes o
  JOIN ap ON ap.owner_id = o.owner_id
  JOIN journal_entry_lines jel ON jel.journal_entry_id = o.je_id
  JOIN bills b ON b.id = o.bill_id
  GROUP BY o.je_id, o.entry_date, o.bill_id, o.owner_id, o.created_by,
           b.vendor_id, b.project_id
),
to_insert AS (
  SELECT je_id, entry_date, bill_id, owner_id, created_by,
         vendor_id, project_id, amount, cash_account_id
  FROM agg
  WHERE cash_account_id IS NOT NULL
    AND amount > 0
),
inserted_payments AS (
  INSERT INTO bill_payments (
    id, owner_id, payment_date, payment_account_id, vendor_id, project_id,
    total_amount, memo, created_by, created_at, updated_at
  )
  SELECT gen_random_uuid(), owner_id, entry_date, cash_account_id,
         vendor_id, project_id, amount,
         'Backfilled from JE ' || je_id::text,
         created_by, now(), now()
  FROM to_insert
  RETURNING id, memo
)
INSERT INTO bill_payment_allocations (bill_payment_id, bill_id, amount_allocated)
SELECT ip.id, ti.bill_id, ti.amount
FROM inserted_payments ip
JOIN to_insert ti
  ON ip.memo = 'Backfilled from JE ' || ti.je_id::text;