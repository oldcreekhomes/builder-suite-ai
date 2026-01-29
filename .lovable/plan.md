
## Change Consolidated Payment Tooltip to Show Cost Codes Instead of Reference Numbers

### Overview
You want the consolidated payment tooltip in the bank register to show the **chart of account or cost code** for each included bill rather than the reference number. This makes more sense for understanding what expenses were paid.

### Current Behavior (Screenshot)
The tooltip shows:
- `(No ref)    $4,950.00`
- `06252025    $100.00`
- `07142025    $776.00`

### Desired Behavior
The tooltip should show:
- `2120 - Permit Fees    $4,950.00`
- `2440 - Land Carrying    $100.00`
- `2065 - Architectural    $776.00`

---

### Technical Changes

#### 1. Extend the `IncludedBillPayment` interface (line 33-37)
Add a field for the account/cost code display:
```typescript
interface IncludedBillPayment {
  bill_id: string;
  reference_number: string | null;  // Keep for potential future use
  amount_allocated: number;
  accountDisplay: string | null;    // NEW: "2120 - Permit Fees"
}
```

#### 2. Populate `accountDisplay` when building allocations (lines 409-423)
After fetching `firstLineByBillForConsolidated` and the cost codes/accounts maps, update the allocation building logic to look up the display name:

```typescript
billPaymentAllocations.forEach(alloc => {
  const bill = alloc.bills as unknown as { reference_number: string | null } | null;
  
  // Look up cost code or account for this bill
  const firstLine = firstLineByBillForConsolidated.get(alloc.bill_id);
  let accountDisplay: string | null = null;
  if (firstLine) {
    if (firstLine.cost_code_id && costCodesMap.has(firstLine.cost_code_id)) {
      accountDisplay = costCodesMap.get(firstLine.cost_code_id) || null;
    } else if (firstLine.account_id && accountsDisplayMap.has(firstLine.account_id)) {
      accountDisplay = accountsDisplayMap.get(firstLine.account_id) || null;
    }
  }
  
  const summary: IncludedBillPayment = {
    bill_id: alloc.bill_id,
    reference_number: bill?.reference_number || null,
    amount_allocated: Number(alloc.amount_allocated),
    accountDisplay: accountDisplay,  // NEW
  };
  // ... rest of the code
});
```

**Note**: This requires reordering the code slightly - the `costCodesMap` and `accountsDisplayMap` must be populated **before** we build the allocations. Currently, cost codes and accounts are fetched after the consolidated payment processing block.

#### 3. Reorder code to ensure lookup maps are ready
Move the cost code and account fetching logic (lines 510-532) to happen **before** building the `IncludedBillPayment` objects. This ensures `costCodesMap` and `accountsDisplayMap` are available when we need them.

#### 4. Update tooltip rendering (lines 1152-1159)
Change from displaying `reference_number` to displaying `accountDisplay`:

**Before**:
```tsx
<span>{bp.reference_number || '(No ref)'}</span>
```

**After**:
```tsx
<span>{bp.accountDisplay || 'Unknown Account'}</span>
```

---

### Files to Modify
| File | Change |
|------|--------|
| `src/components/accounting/AccountDetailDialog.tsx` | Update interface, reorder fetches, and change tooltip display |

---

### Result After Implementation
The consolidated payment tooltip will show:

| Account | Amount |
|---------|--------|
| 2120 - Permit Fees | $4,950.00 |
| 2440 - Land Carrying Costs | $100.00 |
| 2065 - Architectural | $776.00 |
| **Total** | **$5,826.00** |

This matches what the user expects and provides meaningful context about what expenses were included in the combined payment.
