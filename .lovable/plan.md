

## Replace ExternalLink Icon with Standardized Actions Dropdown

### Problem
The PO table in the Budget Details dialog uses a grey `ExternalLink` icon with no header label. This is inconsistent with the rest of the app, which uses a centered 3-dot `TableRowActions` dropdown under an "Actions" header.

### Fix
In `BudgetDetailsPurchaseOrderTab.tsx`:

1. Replace `ExternalLink` import with `TableRowActions` import from `@/components/ui/table-row-actions`
2. Change the last `<TableHead>` from empty to `Actions` with `text-center` and `w-16`
3. Replace the `<TableCell>` containing `<ExternalLink>` with a `<TableCell className="text-center">` containing `<TableRowActions>` with a single action: `{ label: "View PO", onClick: () => handleViewPO(po.id) }`
4. Remove the row-level `onClick` and `cursor-pointer` from `<TableRow>` since the action is now in the dropdown
5. Remove unused `ExternalLink` import from lucide-react

### Files changed
- `src/components/budget/BudgetDetailsPurchaseOrderTab.tsx`

