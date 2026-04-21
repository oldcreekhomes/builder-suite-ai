

## Fix PO Status: don't show "Numerous" when all PO lines match

### Problem
On Manage Bills → Review, bill C26019 (An Exterior, $27,180) has 3 line items, all 3 matched to POs (2025-923T-0027, 2025-923T-0035, 2025-923T-0036) as confirmed by the PO Status Summary popover. The badge incorrectly shows **Numerous** (amber warning) when it should show **Matched** (green).

"Numerous" is meant for *mixed* statuses — some matched, some over/no-PO. When every line is matched, the rollup must be **Matched**, regardless of how many distinct POs are involved.

### Root cause (suspected)
The pending-bill PO status rollup in `src/hooks/usePendingBillPOStatus.ts` currently classifies based on whether lines have a `purchase_order_id` (matched/partial/no_po) but does not produce `numerous`. The `numerous` value is being assigned somewhere downstream — likely a wrapper in `BillsApprovalTabs` / review table that sees "more than 1 distinct PO id" and labels it `numerous`. Distinct-PO-count is the wrong signal; status mix is the right signal.

### Fix
1. **Locate the bad rule.** Search the codebase for where `'numerous'` is assigned (likely in the review/approval table component or a helper that aggregates per-bill PO results). Confirm it's keying off "distinct PO count > 1" instead of "mixed statuses".
2. **Replace with status-mix logic:**
   - All lines matched (1 PO or many) → `matched`
   - All lines over → `over_po`
   - All lines no_po → `no_po`
   - Any mix of matched + over → `numerous`
   - Any mix of matched + no_po → `partial`
   - Otherwise fall back to the dominant status
3. **Keep the PO Status Summary popover unchanged** — it already correctly shows all 3 matched POs.
4. **Tooltip on `numerous`** stays "Mixed PO statuses — some matched, some over" so the meaning is consistent.

### Files likely touched
- `src/hooks/usePendingBillPOStatus.ts` (or its caller in the Review tab)
- The component in `src/components/bills/` that renders the Review table badge — to be confirmed during exploration
- No DB / RLS / migration changes
- No change to `POStatusBadge.tsx` itself

### Verification
- Bill C26019 on Review tab now shows green **Matched** badge.
- A bill with 2 matched + 1 over still shows amber **Numerous**.
- A bill with 2 matched + 1 no-PO shows orange **Partial**.
- A single-line matched bill is unchanged (still **Matched**).
- Approved/Paid tabs are unaffected.

