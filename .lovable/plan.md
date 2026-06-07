Replace the custom dropdown in the Reconciliation History Actions column with the shared `TableRowActions` component used by Manage Bills, so styling, font, spacing, and behavior match the rest of the app exactly. No icons in menu items.

File: `src/components/transactions/ReconcileAccountsContent.tsx`

1. Add `import { TableRowActions } from "@/components/ui/table-row-actions";`. Remove now-unused imports (`MoreHorizontal`, `DropdownMenu*`, and `Eye` if no longer referenced).
2. Replace the Actions `<td>` body with:
   ```tsx
   <TableRowActions actions={[
     {
       label: "Review cleared transactions",
       onClick: () => {
         setSelectedReconciliationForReview(rec);
         setReviewDialogOpen(true);
       },
     },
     ...(canUndoReconciliation ? [{
       label: "Undo reconciliation",
       onClick: () => handleUndoReconciliation(rec),
       variant: "destructive" as const,
       disabled: !isLatestCompleted(rec),
     }] : []),
   ]} />
   ```

No business logic changes.