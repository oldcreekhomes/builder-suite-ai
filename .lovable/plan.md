

## Merge "PEG LLC" into "PEG" - Database Migration

### Current State (Data Found)

| Company | ID | Bills | Cost Codes | Representatives | POs |
|---------|-----|-------|------------|-----------------|-----|
| **PEG** (keep) | `c19e3314-4d27-4ca1-a9b9-c7527ecf1249` | 1 | 1 (2100: MEP Engineering) | 5 | 4 |
| **PEG LLC** (remove) | `16591c5b-05b6-4213-95bd-24cfe77ad85b` | 1 | 1 (2100: MEP Engineering) | 0 | 0 |

### What Needs to Happen

1. **Update Bills**: Change 1 bill (OCH-02304) from PEG LLC → PEG
2. **Handle Cost Codes**: Delete duplicate cost code link (both have same 2100: MEP Engineering)
3. **Delete Company**: Remove "PEG LLC" record after all references are updated

---

### SQL Migration Steps

```sql
-- Step 1: Update bills to reference PEG instead of PEG LLC
UPDATE bills 
SET vendor_id = 'c19e3314-4d27-4ca1-a9b9-c7527ecf1249'
WHERE vendor_id = '16591c5b-05b6-4213-95bd-24cfe77ad85b';

-- Step 2: Delete duplicate company_cost_codes entry for PEG LLC
-- (PEG already has this cost code linked)
DELETE FROM company_cost_codes 
WHERE company_id = '16591c5b-05b6-4213-95bd-24cfe77ad85b';

-- Step 3: Delete the PEG LLC company record
DELETE FROM companies 
WHERE id = '16591c5b-05b6-4213-95bd-24cfe77ad85b';
```

---

### Result After Migration

- "PEG LLC" company record will be completely removed
- The bill OCH-02304 ($1,500) will now be linked to "PEG"
- PO matching will work correctly because:
  - Bill vendor_id = PEG
  - PO company_id = PEG
  - Same cost code (2100: MEP Engineering)
  - **PO Status will show "Matched" ✓**

---

### Safety Checks Completed

| Table | PEG LLC References | Action |
|-------|-------------------|--------|
| `bills` | 1 record | ✅ Update to PEG |
| `company_cost_codes` | 1 record (duplicate) | ✅ Delete |
| `company_representatives` | 0 records | No action needed |
| `project_purchase_orders` | 0 records | No action needed |
| `bill_payments` | 0 records | No action needed |
| `deposits` | 0 records | No action needed |
| `company_insurances` | 0 records | No action needed |

---

### Implementation

I will run this as a database migration using the migration tool. The migration will:
1. Be wrapped in a transaction for safety
2. Execute all three steps atomically
3. Verify the merge was successful

