# Fix: Description field loses focus on every keystroke (Edit Bill → Job Cost)

## Root cause

In `src/components/bills/EditBillDialog.tsx` the Job Cost table renders rows with:

```tsx
<TableRow key={group.key}>
```

`group.key` comes from `groupBillLines` in `src/lib/billLineMath.ts`, which builds the key from cost code + unit cost + **memo** + PO ids:

```ts
const key = [n.costCodeKey, n.unitCost.toFixed(6), n.memo.trim(), ...].join('|');
```

So the moment the user types one character into the Description (memo) input, the group's key changes → React unmounts the old `<TableRow>` and mounts a new one → the `<Input>` is destroyed and recreated → focus/cursor is lost. That's exactly the "type one letter, cursor disappears" symptom.

The Expense tab uses `key={row.id}` (stable) and is not affected.

## Fix

Use a stable React key for Job Cost rows that is independent of the memo. The simplest stable identifier is the first child row's id (rows in the same group always share cost code/unit cost/PO, so the first child id uniquely identifies the group across renders, and for ungrouped rows it is just that row's id).

Change in `src/components/bills/EditBillDialog.tsx` (around line 907):

```tsx
<TableRow key={group.children[0].id}>
```

No change to `groupBillLines` itself — its `key` is still useful for grouping math, we just don't use it as the React reconciliation key.

## Out of scope

- Expense tab (already stable).
- Grouping logic / totals math.
- Any other dialogs.

## Verification

1. Open Manage Bills → Approved → Edit Bill.
2. Click into a Job Cost Description, delete a few characters, type several letters in a row — cursor stays put, full string is entered without focus loss.
3. Confirm grouping still collapses identical rows after blur (unchanged behavior).
