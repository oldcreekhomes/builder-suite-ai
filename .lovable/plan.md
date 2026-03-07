

## Fix: Update PO 2025-923T-0006 Amount to $12,860.02

### Problem
PO 2025-923T-0006 has a total_amount of $12,860.01 but the bill is $12,860.02, causing a 1-cent "Over Budget" discrepancy. The PO should be $12,860.02 to match the bill.

### Changes — Database Migration

A single SQL migration to update both the PO header and its line item:

```sql
-- Update PO total amount
UPDATE project_purchase_orders 
SET total_amount = 12860.02 
WHERE id = '0cc3139e-8901-4ba9-a753-10608b1f980b';

-- Update PO line item amount and unit cost
UPDATE purchase_order_lines 
SET amount = 12860.02, unit_cost = 12860.02 
WHERE id = '2dc65515-3080-43c8-9f6c-43cce1856540';
```

This will make the PO amount match the bill exactly ($12,860.02), resolving the 1-cent over-budget status. Both the table badge and dialog should then show "Matched."

