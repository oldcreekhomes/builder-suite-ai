

## Fix: "On Track" Badge Showing Incorrectly When PO Goes Over Budget

### Problem

The PO Status Summary dialog shows an "On Track" badge in the top-right corner even though the Remaining column displays -$2,548.00. This happens because the badge only checks `purchaseOrder.remaining` (the remaining *before* this bill), while the Remaining column displays the *projected* remaining (after including this bill's amount). When a bill pushes the PO over budget, the numbers are red and negative but the badge still says "On Track."

### What Will Change

**File: `src/components/bills/PODetailsDialog.tsx`**

Update the badge logic (lines 167-174) to also consider the projected remaining when the current bill has pending lines. The badge will use the same logic already used for the warning banner at the bottom of the dialog.

**Current logic:**
```
isOverBudget (remaining < 0)        -> "Over Budget" (red)
isWarning (utilization 90-100%)     -> "Near Limit" (amber)
else                                -> "On Track" (green)
```

**Updated logic:**
```
isOverBudget OR projectedOverBudget -> "Over Budget" (red)
isWarning                           -> "Near Limit" (amber)
else                                -> "Within Budget" (green)
```

Additionally, "On Track" will be renamed to **"Within Budget"** since "On Track" is vague and doesn't clearly describe what's being measured.

### Technical Detail

The variables `projectedOverBudget` and `hasPending` already exist (lines 156-158). The only change is adding `|| (hasPending && projectedOverBudget)` to the badge condition at line 168, and updating the over-budget message to show the projected amount when applicable. The label "On Track" at line 173 changes to "Within Budget."

