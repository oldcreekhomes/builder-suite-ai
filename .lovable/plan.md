
# Simplify Credit UI - Make Credit Badge Clickable

## Change Summary

Remove the separate "($350.00 used)" text and instead make the green "Credit" badge itself the trigger for opening the credit usage history dialog.

## Current Behavior
- Amount column shows: `($150.00)` + `Credit` badge + `($350.00 used)` link
- Two separate clickable elements

## New Behavior
- Amount column shows: `($150.00)` + clickable `Credit` badge only
- Clicking the Credit badge opens the usage history dialog
- Cleaner, simpler UI

## Technical Changes

### File: `src/components/bills/PayBillsTable.tsx`

**Lines 987-1003** - Simplify to single clickable badge:

```typescript
// Before:
{bill.total_amount < 0 && (
  <Badge variant="outline" className="text-green-600 border-green-600">
    Credit
  </Badge>
)}
{bill.total_amount < 0 && (bill.amount_paid || 0) > 0 && (
  <button
    type="button"
    className="text-xs text-muted-foreground hover:underline cursor-pointer"
    onClick={(e) => {
      e.stopPropagation();
      setCreditHistoryDialog({ open: true, bill });
    }}
  >
    (${Math.abs(bill.amount_paid || 0).toFixed(2)} used)
  </button>
)}

// After:
{bill.total_amount < 0 && (
  <Badge 
    variant="outline" 
    className="text-green-600 border-green-600 cursor-pointer hover:bg-green-50"
    onClick={(e) => {
      e.stopPropagation();
      setCreditHistoryDialog({ open: true, bill });
    }}
  >
    Credit
  </Badge>
)}
```

## Result

- Single clickable "Credit" badge in the Amount column
- Clicking it opens the Credit Usage History dialog showing:
  - Original credit amount
  - Amount used
  - Remaining balance
  - Payment history table
