-- Backfill function to consolidate multi-bill payments into single bill_payments records
CREATE OR REPLACE FUNCTION backfill_consolidated_bill_payments()
RETURNS TABLE(
  payment_id UUID,
  project_id UUID,
  vendor_id UUID,
  payment_date DATE,
  bill_count INT,
  total_amount NUMERIC
) AS $$
DECLARE
  payment_group RECORD;
  new_payment_id UUID;
  bill_record RECORD;
BEGIN
  -- Find all multi-bill payment groups (same date, vendor, bank account, project)
  FOR payment_group IN
    SELECT 
      jel.project_id as proj_id,
      b.vendor_id as vend_id,
      b.owner_id as own_id,
      je.entry_date::date as pay_date,
      jel.account_id as bank_account_id,
      -- Net amount: credits to bank (invoices paid) minus debits to bank (credits applied)
      SUM(CASE WHEN jel.credit > 0 THEN jel.credit ELSE -jel.debit END) as net_amount,
      COUNT(DISTINCT b.id) as num_bills,
      ARRAY_AGG(DISTINCT b.id) as bill_ids
    FROM journal_entries je
    JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
    JOIN accounts a ON jel.account_id = a.id
    JOIN bills b ON je.source_id = b.id
    WHERE je.source_type = 'bill_payment'
      AND a.type = 'asset'
      AND (jel.credit > 0 OR jel.debit > 0)
      AND je.is_reversal = false
    GROUP BY jel.project_id, b.vendor_id, b.owner_id, je.entry_date::date, jel.account_id
    HAVING COUNT(DISTINCT b.id) > 1
  LOOP
    -- Skip if already has a consolidated payment for this exact combination
    IF NOT EXISTS (
      SELECT 1 FROM bill_payments bp
      WHERE bp.project_id = payment_group.proj_id
        AND bp.vendor_id = payment_group.vend_id
        AND bp.payment_date = payment_group.pay_date
        AND bp.payment_account_id = payment_group.bank_account_id
    ) THEN
      -- Create consolidated bill_payments record
      INSERT INTO bill_payments (
        owner_id, payment_date, payment_account_id,
        vendor_id, project_id, total_amount, memo
      )
      VALUES (
        payment_group.own_id,
        payment_group.pay_date,
        payment_group.bank_account_id,
        payment_group.vend_id,
        payment_group.proj_id,
        payment_group.net_amount,
        'Backfilled consolidated payment - ' || payment_group.num_bills || ' bills'
      )
      RETURNING id INTO new_payment_id;

      -- Create allocations for each bill in this group
      FOR bill_record IN
        SELECT b.id as bill_id, b.total_amount as bill_total, b.amount_paid
        FROM bills b
        WHERE b.id = ANY(payment_group.bill_ids)
      LOOP
        INSERT INTO bill_payment_allocations (bill_payment_id, bill_id, amount_allocated)
        VALUES (
          new_payment_id,
          bill_record.bill_id,
          bill_record.amount_paid
        );
      END LOOP;

      -- Return result row for visibility
      payment_id := new_payment_id;
      project_id := payment_group.proj_id;
      vendor_id := payment_group.vend_id;
      payment_date := payment_group.pay_date;
      bill_count := payment_group.num_bills;
      total_amount := payment_group.net_amount;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the backfill to populate all consolidated payments
SELECT * FROM backfill_consolidated_bill_payments();

-- Clean up: drop the function after use
DROP FUNCTION IF EXISTS backfill_consolidated_bill_payments();