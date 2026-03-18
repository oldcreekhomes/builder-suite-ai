

## Fix: Crashed Schedule — Stuck `__TEMP__` Hierarchy Numbers

### What Happened

The task reorder mechanism uses a two-phase approach: Phase 1 sets all affected tasks to temporary `__TEMP_N__` values, Phase 2 sets the final values. Phase 2 failed (likely a timeout or network drop) and the rollback also failed, leaving 20 tasks in section 8 (INTERIOR CONSTRUCTION) stuck with `__TEMP_` hierarchy numbers.

### Part 1: Data Repair (Edge Function)

Create and run a one-time repair edge function that restores the correct hierarchy numbers. I reconstructed the original numbering by tracing the predecessor dependency chains:

```text
__TEMP_6__  → 8.19  Install Sewer/Water
__TEMP_18__ → 8.20  Prep for Final Inspection
__TEMP_17__ → 8.21  TPF Inspection
__TEMP_16__ → 8.22  Paint, point, sand
__TEMP_19__ → 8.23  Measure Countertops
__TEMP_14__ → 8.24  Set Units & HVAC Start Check
__TEMP_15__ → 8.25  Install Fireplace
__TEMP_13__ → 8.26  Install Countertops
__TEMP_12__ → 8.27  Install Tile & Backsplash
__TEMP_11__ → 8.28  Hardwood & Finish Stairs
__TEMP_10__ → 8.29  MEP Trim-out
__TEMP_9__  → 8.30  Install Appliances
__TEMP_8__  → 8.31  Final Paint
(8.32 = Install Elevator — already correct)
__TEMP_7__  → 8.33  Punchout, Closets & Hardware
__TEMP_4__  → 8.34  First Clean
__TEMP_5__  → 8.35  Building Final - 1st Inspection
__TEMP_3__  → 8.36  Fix Inspection Issues
__TEMP_2__  → 8.37  Building Final - 2nd Inspection
__TEMP_1__  → 8.38  Certificate of Occupancy
__TEMP_0__  → 8.39  Final Clean
```

All existing predecessor references (from both TEMP and non-TEMP tasks) are verified consistent with this mapping. No predecessor updates needed.

**File: `supabase/functions/repair-schedule-hierarchies/index.ts`** (new, one-time use)
- Takes a project ID
- Runs 20 UPDATE statements matching each task ID to its correct hierarchy number
- Deploy, run once, then delete

### Part 2: Prevent Future Crashes

**File: `supabase/functions/bulk-update-hierarchies/index.ts`**

Replace the two-phase `Promise.all` approach with a single SQL transaction using `BEGIN`/`COMMIT`/`ROLLBACK`. This makes the entire operation atomic — if any update fails, ALL changes are rolled back automatically by Postgres, so tasks can never get stuck in a `__TEMP_` state.

```text
Current (fragile):
  Phase 1: Promise.all → set __TEMP_ values (20 individual updates)
  Phase 2: Promise.all → set final values (20 individual updates)
  If Phase 2 fails → manual rollback (also 20 individual updates, can also fail)

Fixed (atomic):
  Single RPC call → SQL function runs BEGIN/UPDATE all/COMMIT
  If anything fails → automatic ROLLBACK, zero corruption
```

Create a new Supabase SQL function `bulk_update_hierarchy_numbers` that accepts a JSON array of `{id, hierarchy_number}` and performs all updates in a single transaction. Update the edge function to call this RPC instead of doing individual updates.

**File: `src/hooks/useTaskBulkMutations.ts`**

Update the client-side fallback (lines 95-178) to also use the RPC function instead of the two-phase approach, as a belt-and-suspenders measure.

### Summary

1. Deploy repair edge function and run it to fix the 20 corrupted tasks
2. Replace fragile two-phase update with atomic SQL transaction to prevent this from ever happening again

