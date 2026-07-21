Revert `src/components/bills/BillPOSummaryDialog.tsx` to the previous grouped display:

- Remove the "entry order" sort mode that expands one row per lot.
- Restore the original behavior: one row per cost code + description group, with the deduplicated **Lots** cell showing the lot count (e.g. "19 Lots") and the hover tooltip listing each lot with its summed amount.
- Keep the small grey sort toggle on the **Cost Code** header ONLY if you want it; otherwise remove it entirely and restore the pure default cost-code sort.

Please confirm: should I remove the Cost Code sort toggle button as well, or leave it (toggling only between cost-code asc/desc, no entry-order mode)?