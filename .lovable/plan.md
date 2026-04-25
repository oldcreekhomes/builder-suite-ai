## Direct answer to your question

**Is there a reason not to use one single component everywhere? Yes — but only for the *save logic*, not the layout.**

- `EditExtractedBillDialog` edits **pending/extracted bills** (no journal entries yet, no period-close checks, no A/P balance to keep in sync).
- `EditBillDialog` edits **posted bills** (Approved / Paid / Rejected re-edits) and must run `updateApprovedBill` / `correctBill`, recompute journal entries, respect closed accounting periods, and preserve `bill_payment_allocations`.

Collapsing those two into one component would put the posted-bill safety logic at risk of running on extracted bills (and vice versa) — that's a corruption-class bug, not a UI nit.

**However, you are 100% right that the *layout* should be identical.** That's purely cosmetic and there's no reason for the footer to differ. The shared math helper (`src/lib/billLineMath.ts`) already guarantees the *numbers* match — we just need the *chrome* to match too.

## What's different today (looking at your two screenshots)

| Element | Enter with AI (correct) | Edit Bill (wrong) |
|---|---|---|
| Total location | Bottom-right, large bold `$1,402.50` | Bottom-left, inside table footer (`Job Cost Total: $1,402.50`) |
| Cancel / Save | Below total, right-aligned, separate row | Inline in the muted table footer bar |
| Per-tab footer | One shared total under both Job Cost & Expense tabs | Duplicated footer inside each tab's table |
| Label | `Total:` | `Job Cost Total:` / `Expense Total:` |

## Plan — port the Enter-with-AI footer into EditBillDialog

**File: `src/components/bills/EditBillDialog.tsx`**

1. **Remove the in-table muted footer bar** from both the Job Cost tab (lines ~1093-1112) and the Expense tab (lines ~1217-1236). The `<Table>` ends cleanly with `</TableBody></Table>` like in `EditExtractedBillDialog`.

2. **Add a single shared footer *outside* the `<Tabs>` block** (right after the closing `</Tabs>` around line 1239), copying the exact markup from `EditExtractedBillDialog.tsx` lines 1662-1676:
   ```tsx
   {/* Total */}
   <div className="flex justify-end items-center gap-4 pt-4 border-t">
     <span className="text-lg font-semibold">Total:</span>
     <span className="text-2xl font-bold">
       {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
         .format(jobCostSubtotal + expenseSubtotal)}
     </span>
   </div>

   {/* Actions */}
   <div className="flex justify-end gap-2">
     <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateBill.isPending || correctBill.isPending}>
       Cancel
     </Button>
     <Button onClick={handleSave} disabled={updateBill.isPending || correctBill.isPending}>
       {updateBill.isPending || correctBill.isPending ? "Saving..." : "Save Changes"}
     </Button>
   </div>
   ```
   - Total = `jobCostSubtotal + expenseSubtotal` (so it reflects both tabs combined, matching how the Enter-with-AI dialog uses `calculateTotal()` across all lines).
   - Negative-amount handling (bill credit → green) is preserved by branching the label/className just like today, but in the new footer location.

3. **Keep all save logic identical** — `handleSave`, `updateBill`, `correctBill`, period-close check, `deletedLineIds`, `updateApprovedBill` are all untouched. Only the JSX of the footer moves.

4. **Add Row button parity** — `EditExtractedBillDialog` uses a single `+ Add Line` in the tabs header strip (right side). Today `EditBillDialog` has a separate `+ Add Row` button above each table. I will move it to the right of the `TabsList` header so the chrome matches the first screenshot exactly.

## What is NOT changing (and why)

- `EditExtractedBillDialog.tsx` — already correct, do not touch.
- Save / journal-entry / period logic in `EditBillDialog` — must stay separate from the extracted-bill path. This is the "reason not to" merge components fully.
- Shared math (`src/lib/billLineMath.ts`) — already unified; the displayed total in the new footer will match per-row totals automatically.

## Result

Edit Bill in **Review, Rejected, Approved, and Paid** will look identical to **Enter with AI**:
- Total bottom-right, large bold
- Cancel / Save Changes on their own right-aligned row below the total
- One `+ Add Line` button in the tabs strip, not inside each tab body
- Numbers driven by the same shared math helper, so footer total === sum of visible row totals across both tabs.