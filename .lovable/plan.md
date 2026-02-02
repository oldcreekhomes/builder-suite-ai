

## Cleanup Plan: Delete Fake Migration-Created Purchase Orders

### Good News First
**No vendors received emails** from the bad migration. The SQL migration inserted records directly into the database, completely bypassing the application code that sends `send-po-email` notifications. Vendors are unaware of these fake POs.

---

## Scope of Cleanup

| Project | Fake POs to Delete | Real POs to Keep |
|---------|-------------------|------------------|
| 115 E. Oceanwatch Ct | 16 | 27 |
| 126 Longview Drive | 7 | 45 |
| 5701 9th Street | 24 | 73 |
| 5707 9th St N | 20 | 63 |
| 7659 Waterloo Farm Rd | 1 | 6 |
| 859 N Lexington | 33 | 46 |
| 923 17th St South | 17 | 51 |
| 103 E Oxford Ave | 2 | 4 |
| **TOTAL** | **120** | **315** |

---

## Implementation Steps

### Step 1: Delete Fake POs from Database

Execute a single SQL DELETE that targets only POs created by the bad migration. These are identifiable by:
- The exact note text: `'Auto-generated PO for previously closed bid'`
- Created timestamp within the migration execution window

```sql
DELETE FROM project_purchase_orders 
WHERE notes = 'Auto-generated PO for previously closed bid'
  AND created_at >= '2026-01-30 19:36:52'
  AND created_at < '2026-01-30 19:36:53';
```

### Step 2: Delete the Bad Migration File

Remove the migration file to prevent it from running on any new environments:

**File to delete:** `supabase/migrations/20260130193653_4de6975f-8bac-4ecd-8554-d7ab25a8e061.sql`

---

## Technical Details

### Why This Is Safe

1. **Precise targeting**: The DELETE query uses TWO criteria that only match migration-created POs:
   - Exact note text that was only used by this migration
   - Timestamp within a 1-second window when the migration ran

2. **No cascade effects**: The `project_purchase_orders` table doesn't have dependent records that would be orphaned

3. **Real POs protected**: Any PO created through normal application workflow (UI, bid closeout) will NOT have this specific note text

### Verification Query (will run after cleanup)

```sql
-- Confirm all fake POs are gone and real ones remain
SELECT 
  p.address,
  COUNT(*) as remaining_pos
FROM project_purchase_orders ppo
JOIN projects p ON p.id = ppo.project_id
WHERE ppo.notes = 'Auto-generated PO for previously closed bid'
GROUP BY p.id, p.address;
-- Should return 0 rows
```

---

## Summary

| Action | Details |
|--------|---------|
| Delete 120 fake POs | SQL DELETE targeting migration-specific note and timestamp |
| Keep 315 real POs | All legitimate POs remain untouched |
| Delete migration file | Prevents future occurrences |
| Email impact | None - vendors never received notifications |

