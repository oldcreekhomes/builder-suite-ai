
## Fix: Paid Tab Columns (PO Status, Cleared, Actions) Still Cut Off

### Root Cause Analysis

The last edit made two changes that now conflict:

1. `<div className="border rounded-lg overflow-auto">` — outer div has overflow-auto
2. `<Table containerClassName="relative w-full">` — this REMOVED the Table's own internal `overflow-auto` wrapper

The problem is that removing the Table's internal overflow means the table's content now overflows the `border rounded-lg` div — but that div is itself inside `<div className="flex flex-col h-full">` which constrains height but not width. The `overflow-auto` on the border div handles *vertical* scroll fine but the *horizontal* overflow is being absorbed by the Dialog's own `overflow-auto` container (`flex-1 overflow-auto px-6 pb-6` in `ManageBillsDialog`), which doesn't have enough context to scroll just the table horizontally.

### The Fix

Revert `containerClassName="relative w-full"` back to the default (remove that prop entirely), so the `<Table>` component uses its built-in `relative w-full overflow-auto` container. This means the table itself handles horizontal scrolling internally, which is the correct pattern per the memory notes for dialogs.

The outer `border rounded-lg overflow-auto` div can remain — having both is harmless since the inner Table scroll will intercept horizontal overflow first.

### File to Edit

**`src/components/bills/BillsApprovalTable.tsx`** — line 601:

- Current: `<Table containerClassName="relative w-full">`
- Change to: `<Table>` (remove containerClassName prop entirely, restoring the default `relative w-full overflow-auto`)

This is a one-line change that restores the original working behavior.
