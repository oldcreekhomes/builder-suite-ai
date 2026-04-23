

## Fix line ordering on Edit Extracted Bill so lots flow chronologically

When a multi-lot bill is auto-split (Enter with AI), the Edit Extracted Bill dialog currently shows all original lines under Lot 1 first, then re-cycles through Lot 2..N, then Lot 2..N again, for each original line. The user wants a clean chronological flow:

```
Lot 1  – line A
Lot 1  – line B
Lot 1  – line C
...
Lot 2  – line A
Lot 2  – line B
Lot 2  – line C
...
Lot 19 – line A
Lot 19 – line B
Lot 19 – line C
```

### Root cause

`supabase/functions/split-pending-bill-lines/index.ts` keeps each original line at its existing `line_number` and assigns it to Lot 1, then appends new rows for lots 2..N at the end of the line_number sequence using a single shared offset counter. The dialog (`EditExtractedBillDialog.tsx`) and `usePendingBills` both order by `line_number ASC`, so the visual order matches the insertion order — which is "all originals as Lot 1, then lot2-of-line1, lot3-of-line1, ..., lot2-of-line2, lot3-of-line2, ...". That's why the screenshot shows ~7 Lot 1 rows, then a 2→19 block, then another 2→19 block, etc.

### Fix

Renumber `line_number` for ALL split rows so they are stored grouped by lot (lot 1 block first, then lot 2 block, etc.), preserving the original line ordering inside each lot block.

**File:** `supabase/functions/split-pending-bill-lines/index.ts`

- After fetching the unsplit lines per upload, compute a stable original ordering (current `line_number ASC`).
- Reassign `line_number` so the final layout per upload is:
  - Lot 1: original line A, B, C, ...
  - Lot 2: original line A, B, C, ...
  - ...
  - Lot N: original line A, B, C, ...
- Lines that already had a `lot_id` (not part of the split) keep their existing line numbers; new split rows are placed after them, still grouped by lot in chronological order.
- For the very first lot, update the existing original row in place (as today) but also update its `line_number` to fit the new grouped sequence.
- Inserts for lots 2..N use the new grouped line numbers.

No schema or RLS changes. No client-side changes — `usePendingBills` and `EditExtractedBillDialog` already sort by `line_number`, so they'll automatically render chronologically once the edge function writes the right numbers.

### Scope and non-impact

- Only affects future Enter-with-AI auto-splits. Existing already-split pending bills will keep their current order unless re-processed.
- Address column tooltip on the Manage Bills table is unaffected (still groups by lot — the user already confirmed it looks perfect).
- Manual Bill Entry, Write Checks, and Credit Cards "Split evenly" actions are unaffected (they build rows in order client-side).
- Saved bill totals, amounts, lot allocations, and per-lot math are unchanged — only `line_number` ordering changes.

### Verification

1. Upload the attached `Gray_Invoice_12429` PDF on a 19-lot project via Enter with AI.
2. Open Edit Extracted Bill from the row's Actions menu.
3. Confirm rows scroll as: all original line items under Lot 1, then all under Lot 2, then Lot 3 ... through Lot 19. No "Lot 1 ×7" cluster, no Lot 2→19 repeats per original line.
4. Address tooltip on the Manage Bills row still shows Lot 1..19 with $73.79 each (Lot 19 = $74.28), Total $1,402.50 — unchanged.
5. Approve the bill and confirm allocations and totals are identical to before.

