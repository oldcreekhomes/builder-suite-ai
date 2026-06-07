## Goal
Standardize the Reconciliation History Actions column in `src/components/transactions/ReconcileAccountsContent.tsx` to match the rest of the app: remove the two inline icons (Eye / red Lock) and replace them with a single three-dot (MoreHorizontal) trigger that opens a DropdownMenu.

## Changes
File: `src/components/transactions/ReconcileAccountsContent.tsx`

1. Add imports:
   - `MoreHorizontal` from `lucide-react`
   - `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem` from `@/components/ui/dropdown-menu` (if not already imported)

2. Replace the Actions `<td>` (lines ~1687–1735) with a single dropdown:
   - Trigger: ghost `Button` `h-8 w-8 p-0` with `<MoreHorizontal className="h-4 w-4" />`
   - Item 1: "Review cleared transactions" (with Eye icon on left) — opens review dialog (existing handler)
   - Item 2 (only when `canUndoReconciliation`): "Undo reconciliation" (with Lock icon on left, red text) — calls `handleUndoReconciliation(rec)`, `disabled={!isLatestCompleted(rec)}`
   - Drop the TooltipProvider wrappers; tooltips no longer needed since labels are visible in the menu.

3. Keep all existing handlers, dialogs, and column header ("Actions") unchanged.

No business logic changes; purely a UI standardization to the three-dot menu pattern used elsewhere.