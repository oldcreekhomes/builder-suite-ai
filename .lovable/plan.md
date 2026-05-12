## Change

Update the vendor on two bills for 923 17th St. South from **Lynn Wholesale Flooring** to **Old Creek Homes, LLC**. Database-only change, no code edits.

## Bills affected

| Reference | Date | Amount | Status |
|---|---|---|---|
| S683644 | 03/29/2026 | $18,170.43 | posted |
| S691495 | 04/02/2026 | $201.72 | posted |

## SQL

```sql
UPDATE public.bills
SET vendor_id = '4e36c64e-1af3-4566-aa01-10997cd285ab'  -- Old Creek Homes, LLC
WHERE id IN (
  '64e269a9-1a72-46df-a408-81cf36fb4fe8',  -- S683644
  'd22250d7-de90-4e78-b018-233e8d37c028'   -- S691495
);
```

Journal entries do not carry a `vendor_id` column, so no GL rows need adjusting. Bill lines, payments, and PO links are unaffected by the vendor change.
