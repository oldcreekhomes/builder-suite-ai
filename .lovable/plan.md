## Goal
Make the ML upload spinner display a single, uniform message — `Extracting X bills from machine learning...` — where X is the **total number of bills** being uploaded, held constant from the moment extraction starts through the end of enrichment.

## Current behavior (the bug)
The spinner number changes 3 times because it's bound to `extractingCount`, which reflects "remaining files" in real time:
1. Starts at **0** (state default before first progress event fires)
2. Jumps to **1** (or N) once `onExtractionProgress` reports remaining files
3. Drops back to **0** when extraction completes (`setExtractingCount(0)` in `handleExtractionComplete`) — but the spinner stays visible during enrichment, so the user sees "Extracting 0 bills..."

## Fix
In `src/components/bills/BillsApprovalTabs.tsx`:

1. **Track the total, not the remaining**: Replace `extractingCount` semantics with `extractingTotal` — set once when extraction starts and never decremented during the run.
   - In `handleExtractionStart`, accept the `total` argument that `SimplifiedAIBillExtraction` already passes (`onExtractionStart?.(totalFiles)` at line 156) and store it: `setExtractingTotal(total)`.
   - Remove the per-file decrement in `handleExtractionProgress` (or ignore it for the spinner label).
   - Do NOT reset the total in `handleExtractionComplete` — only clear it after enrichment finishes (in the same place `setIsEnriching(false)` is called, around line 533, and in the early-exit branch at line 136).

2. **Update spinner JSX (line 1038)**:
   ```tsx
   Extracting {extractingTotal} bill{extractingTotal !== 1 ? "s" : ""} from machine learning...
   ```
   No conditional text changes between phases — same message the whole time.

3. **Wire up the prop**: The call site at line 976 currently does `onExtractionStart={(total) => handleExtractionStart()}` — drop the total. Change `handleExtractionStart` to `(total: number) => { setExtractingTotal(total); setIsExtractingML(true); justExtractedRef.current = true; }`.

## Files
- `src/components/bills/BillsApprovalTabs.tsx` (only file changed)

## Out of scope
- Spinner inside `SimplifiedAIBillExtraction.tsx` (toast-based, separate UI) — leave alone.
- Enrichment timing logic — already working per user ("other than that, it's working").
