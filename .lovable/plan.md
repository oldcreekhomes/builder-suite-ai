Plan to fix the remaining 4000 → 4275 flicker

The flicker is still happening because one final cost-code correction runs inside `BatchBillReviewTable` after the table is already visible. The parent spinner currently waits for extraction and the first enrichment pass, but the child table then calls `rematch-pending-bill`, refreshes the lines, and changes the displayed cost code from 4000 to 4275 a few seconds later.

I will move that final rematch into the parent loading flow so the spinner stays up until the data is truly finished.

Steps:
1. Update `BillsApprovalTabs.tsx`
   - After extraction completes and pending bills are refetched, run the same `rematch-pending-bill` process for the freshly uploaded bill(s) before calling `setBatchBills`.
   - Re-read `pending_bill_lines` after rematch and only then update the visible table state.
   - Keep `isEnriching` true during this whole phase, so the ML spinner remains on screen until the final 4275 cost code is already loaded.
   - Update the spinner text from “Extracting 0 bills…” to a cleaner finalizing message when extraction is done but cost-code/PO cleanup is still running.

2. Update `BatchBillReviewTable.tsx`
   - Remove or disable the automatic “auto-snap pending bill cost codes” effect that runs after render.
   - Keep manual rematch actions intact.
   - This prevents the table from doing hidden post-render corrections that users can see as a flicker.

3. Preserve behavior for normal page loads
   - Only hold the spinner for bills from a fresh upload.
   - Existing extracted bills should still load normally without showing a surprise spinner on hard refresh.

Technical notes:
```text
Upload starts
  -> ML extraction spinner
  -> pending bills refetch
  -> lot assignment / split
  -> PO matching
  -> rematch-pending-bill final cost-code snap
  -> re-read final lines
  -> table renders once with final cost codes
```

Files to modify after approval:
- `src/components/bills/BillsApprovalTabs.tsx`
- `src/components/bills/BatchBillReviewTable.tsx`