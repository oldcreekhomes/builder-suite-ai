# Fix the "Enter with ML" cost-code flicker

## What you're seeing

When a PDF bill finishes extracting on the **Enter with ML** tab:
1. The "Extracting … from machine learning" spinner disappears.
2. The table briefly renders the line with the **wrong cost code** (e.g., `4000: HOME BUILDING COSTS` — the generic default).
3. About 2–3 seconds later the screen "reloads" and the cost code corrects itself to the right one (e.g., `4275: Concrete`).

That second update is the **PO auto-matching pass**. It runs after extraction, finds the matching Purchase Order line, and inherits its cost code onto the bill line — but it runs **after** the spinner has already been dismissed, so the user sees the intermediate state.

## Root cause

In `src/components/bills/BillsApprovalTabs.tsx`:

- `handleExtractionComplete` immediately sets `isExtracting = false` as soon as the ML extraction edge function returns. The spinner unmounts and the table mounts with the raw extracted data.
- The PO auto-matching logic lives in a separate `useEffect` (lines ~118–449) keyed on `pendingBills`. It fetches lines, runs PO matching, updates the DB with the inherited cost code, then calls `setBatchBills(...)` — which causes the visible "fix" a couple seconds later.

So extraction-complete and PO-matching-complete are two separate moments, and the spinner only covers the first.

## Fix

Keep the ML spinner on screen until **both** extraction and the post-extraction PO auto-matching have finished. The user should never see the intermediate "wrong cost code" state.

### Changes (single file: `src/components/bills/BillsApprovalTabs.tsx`)

1. **Don't dismiss the spinner inside `handleExtractionComplete`.** Leave `isExtracting = true` and only refetch pending bills there. Optionally swap the spinner copy to "Matching purchase orders…" once extraction itself is done, but reuse the exact same spinner UI (logo, font, outline) — no second spinner.

2. **Track an "enrichment in progress" flag inside the existing pending-bills `useEffect`.** Set it `true` at the start of `fetchAllLines` and `false` after `setBatchBills(...)` in the not-cancelled branch (and in error paths). 

3. **Drive `isExtracting` from the combined state.** The spinner stays visible while either:
   - the ML edge function is still running, OR
   - the post-extraction enrichment pass (lot auto-split + PO auto-matching + cost-code inheritance) is still running on freshly arrived `pendingBills`.

4. **Only render the `BatchBillReviewTable` once enrichment is done**, so the first paint already shows the correct cost code. The empty-state `UploadDropzone` continues to show when there are zero bills and nothing is in flight.

5. **Guard against false positives.** Only treat the enrichment pass as "spinner-worthy" when it was triggered by a brand-new upload (e.g., `pendingBills.length` increased, or a bills-just-extracted ref set in `handleExtractionComplete`). Existing bills already on the tab when the user opens it must not show a spinner on mount.

### Result

- Upload a PDF → spinner shows "Extracting … from machine learning" continuously.
- Behind the scenes: extraction finishes → lot split → PO match → cost-code inherit → DB persist → state update.
- Spinner disappears once and the table appears with the **final** cost code already in place. No flicker, no second "reload".

## Files touched

- `src/components/bills/BillsApprovalTabs.tsx` (only)

No DB, edge function, or other component changes needed.
