
# Delete Empty "Anchor Loans" and Rename "Anchor Loans LP"

## Summary
Delete the empty "Anchor Loans" company and rename "Anchor Loans LP" to "Anchor Loans". This is simpler than transferring data since all 11 bills are already on "Anchor Loans LP".

## Current State
| Company | Bills | POs | Cost Codes |
|---------|-------|-----|------------|
| Anchor Loans | 0 | 0 | 0 |
| Anchor Loans LP | 11 (~$60,569) | 0 | 2 |

## Implementation Steps

### Step 1: Delete Empty "Anchor Loans"
Remove the company with no associated data:

```sql
DELETE FROM companies 
WHERE id = '31b1fa0b-0b89-4b17-a5e4-4a031b9c27e6';
```

### Step 2: Rename "Anchor Loans LP" to "Anchor Loans"
Update the company name:

```sql
UPDATE companies 
SET company_name = 'Anchor Loans'
WHERE id = '54397ed8-f88f-4a74-bb36-51e03a3b436e';
```

## Why This Is Better
- No data transfer needed
- All 11 bills stay linked to their original company ID
- All journal entries remain intact
- Cost code assignments stay in place
- Simpler operation with less risk

## Expected Result
- Single company named "Anchor Loans" with all 11 bills and 2 cost code assignments
- Empty duplicate permanently removed
