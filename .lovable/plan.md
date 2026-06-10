ns
## Goal
When a bill line is split across all lots (e.g. 19 lots), show it as **one row** in the edit dialogs — not two. The remainder lot (different unit cost) gets folded into the same group, and the hover tooltip reveals each lot's individual amount, including the rounded last lot ($31.74 vs $31.57).

## Changes

### 1. `src/lib/billLineMath.ts` — `groupBillLines`
- Change the grouping key to exclude `unitCost`. New key: `costCode + memo + purchaseOrderId + purchaseOrderLineId`.
- For groups where every child has a `lotId` and there are 2+ children (lot-distributed):
  - `amount` = sum of each child's `qty × unitCost` (naturally includes the remainder cent fix, e.g. $600.00)
  - `quantity` = sum of child quantities (e.g. 19)
  - `unitCost` = modal (most common) child unit cost — the displayed "per lot" rate ($31.57)
  - `lotCost` = `amount / lotCount` (informational)
  - `isGrouped` = true, `children` = all lot rows in original order
- Non-lot rows: keep current behavior (still require matching `unitCost` to merge so unrelated expense rows don't collapse).

### 2. `splitJobCostRowEvenly` — unchanged
Still writes 19 `bill_line` children to the DB (18 @ $31.57, 1 @ $31.74). Storage and saved totals are identical to today.

### 3. `EditBillDialog.tsx` / `EditExtractedBillDialog.tsx` — no logic changes
The "(all 19 lots)" hover tooltip already iterates `group.children` and prints each child's amount, so once the remainder lot lands in the same group, Lot 19's $31.74 will appear automatically. Footer total stays $600.00.

### 4. Initial Mobilization bill — unaffected
9 distinct cost codes → still 9 rows.

## Technical notes
- Only `src/lib/billLineMath.ts` is edited.
- No DB writes, no migration, no changes to save/approve flow.
- Quantity/Unit Cost inputs (recent `EditableNumberInput` work) remain as-is.
