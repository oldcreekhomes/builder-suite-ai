

## Add Delete Action to Review Tab's Actions Dropdown

**Problem**: The Review tab (draft bills) has Approve/Edit/Reject in its actions dropdown but no Delete option. The `deleteBill` mutation is already available in the component.

**Fix**: Add a "Delete Bill" destructive action to the existing `TableRowActions` array for draft bills (line 998-1002).

### Changes

**File: `src/components/bills/BillsApprovalTable.tsx`** (line ~998-1002)

Add a Delete entry after Reject in the draft actions:

```typescript
<TableRowActions actions={[
  { label: "Approve", onClick: () => handleActionChange(bill.id, 'approve'), disabled: approveBill.isPending || rejectBill.isPending },
  { label: "Edit", onClick: () => handleActionChange(bill.id, 'edit'), disabled: approveBill.isPending || rejectBill.isPending },
  { label: "Reject", onClick: () => handleActionChange(bill.id, 'reject'), variant: 'destructive' as const, disabled: approveBill.isPending || rejectBill.isPending },
  {
    label: "Delete Bill",
    onClick: () => deleteBill.mutate(bill.id),
    variant: "destructive" as const,
    requiresConfirmation: true,
    confirmTitle: "Delete Bill",
    confirmDescription: `Are you sure you want to delete this bill from ${bill.companies?.company_name} for ${formatCurrency(bill.total_amount)}? This action cannot be undone.`,
    isLoading: deleteBill.isPending,
  },
]} />
```

Single line-range edit. The `deleteBill` mutation and `formatCurrency` are already imported and available.

