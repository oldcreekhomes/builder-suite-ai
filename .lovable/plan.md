

# Simplest Solution: Auto-Split Without Dialog

## Current Flow (Complex)
1. User clicks "Submit Selected Bills"
2. Code detects lines missing lot_id
3. Opens LotAllocationDialog
4. User confirms allocation
5. Client does N×M database calls (slow, times out)
6. Submission continues

## New Flow (Simple)
1. User clicks "Submit Selected Bills"
2. Code detects lines missing lot_id
3. **Calls edge function once** to split evenly across all lots
4. Shows toast: "Bills split evenly across 3 addresses"
5. Submission continues automatically

No dialog. No waiting. One API call.

---

## Implementation

### Step 1: Create Edge Function `split-pending-bill-lines`

**File:** `supabase/functions/split-pending-bill-lines/index.ts`

This function receives pending bill IDs and splits any lines without `lot_id` evenly across all project lots:

```typescript
// Input: { pendingUploadIds: string[], projectId: string }
// Logic:
//   1. Fetch all project lots
//   2. Fetch all pending_bill_lines without lot_id for those uploads
//   3. For each line, calculate even split amounts
//   4. Update original line with first lot
//   5. Batch insert new lines for remaining lots
// Output: { success: true, linesUpdated: N, linesCreated: M }
```

Key features:
- Single query to fetch all lines
- Batch update + batch insert (2 DB operations total)
- Even split with rounding: first lots get ceiling, last lot gets remainder

### Step 2: Simplify `handleSubmitAllBills`

**File:** `src/components/bills/BillsApprovalTabs.tsx`

Replace the "show dialog" logic (lines 339-360) with a direct edge function call:

```tsx
// Current code (lines 339-360):
if (lots.length >= 2) {
  const billsWithMissingLots = validatedBills.filter(bill =>
    bill.lines?.some(line => !line.lot_id)
  );
  
  if (billsWithMissingLots.length > 0) {
    // ... shows dialog, stops submission
  }
}

// NEW code:
if (lots.length >= 2) {
  const billsWithMissingLots = validatedBills.filter(bill =>
    bill.lines?.some(line => !line.lot_id)
  );
  
  if (billsWithMissingLots.length > 0) {
    // Auto-split via edge function
    const { error } = await supabase.functions.invoke('split-pending-bill-lines', {
      body: {
        pendingUploadIds: billsWithMissingLots.map(b => b.id),
        projectId: effectiveProjectId
      }
    });
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    
    toast({
      title: "Auto-Allocated",
      description: `Bills split evenly across ${lots.length} addresses`,
    });
    
    // Refetch to get updated lines, then continue
    await refetchPendingBills();
  }
}
// ... rest of submission continues
```

### Step 3: Remove Dialog Components (Optional Cleanup)

Can keep them for now (unused), or remove:
- `showLotAllocationDialog` state
- `pendingAllocationData` state  
- `shouldContinueSubmit` state
- `handleAllocationConfirm` function
- `handleAllocationCancel` function
- `LotAllocationDialog` component import and JSX

---

## Files to Change

| File | Action |
|------|--------|
| `supabase/functions/split-pending-bill-lines/index.ts` | **CREATE** - New edge function |
| `src/components/bills/BillsApprovalTabs.tsx` | **MODIFY** - Replace dialog trigger with edge function call |

---

## Expected Behavior

1. Upload 2 invoices for a multi-lot project
2. Click "Submit Selected Bills"
3. Toast appears: "Bills split evenly across 3 addresses"
4. Bills move to Review tab immediately
5. Address column shows "+3" with hover breakdown

**Time to complete: ~2 seconds instead of 30+ minutes**

---

## Future Enhancement (If Needed)

If users later want custom splits (not 50/50), we can:
1. Add a small inline dropdown: "Split evenly" / "Custom split..."
2. Only show dialog for "Custom split..."
3. 90% of users will just use even split

But start with auto-even-split - it covers the common case!

