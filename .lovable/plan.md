

## Update PO Status System to Pre-Approved Workflow

### Overview

Align the entire PO system with the new pre-approved workflow where all POs (manual or from bid closeout) are immediately approved upon creation.

---

### Part 1: Database Migration

Update existing PO records to reflect the new workflow:

```sql
-- Update all draft POs to approved (123 records)
UPDATE project_purchase_orders 
SET status = 'approved', updated_at = NOW() 
WHERE status = 'draft';

-- Update all pending POs to approved (55 records)
UPDATE project_purchase_orders 
SET status = 'approved', updated_at = NOW() 
WHERE status = 'pending';
```

**Impact**: 178 POs will be updated to `approved` status

---

### Part 2: Code Changes

Update the code so all new POs are created with `approved` status:

| File | Current Status | New Status | Context |
|------|---------------|------------|---------|
| `src/hooks/usePOMutations.ts` | `draft` | `approved` | Bid closeout creates PO |
| `src/components/CreatePurchaseOrderDialog.tsx` | `pending` | `approved` | Manual PO creation |

---

### Result After Changes

- All existing POs (except rejected) will have status `approved`
- All new POs will be created with status `approved`
- Bill matching will work immediately for all POs
- No more "waiting for vendor confirmation" - POs are pre-approved by design

---

### Files to Modify

1. **Database migration** - Update 178 existing records
2. `src/hooks/usePOMutations.ts` - Change `draft` → `approved` 
3. `src/components/CreatePurchaseOrderDialog.tsx` - Change `pending` → `approved`

