

## Conditionally Hide Address Column Based on Lot Count

### Summary
Hide the Address column in all bill tables when a project has 1 or fewer lots. Show it when there are 2+ lots.

### Changes

**All three files** get the same pattern:
- Import `useLots` hook
- Add `const showAddressColumn = lots.length > 1`
- Wrap Address `<TableHead>` and `<TableCell>` with `{showAddressColumn && ...}`
- Adjust colSpan counts

| File | Tabs Affected |
|---|---|
| `src/components/bills/BatchBillReviewTable.tsx` | Enter with AI |
| `src/components/bills/BillsApprovalTable.tsx` | Review, Rejected, Paid |
| `src/components/bills/PayBillsTable.tsx` | Approved |

