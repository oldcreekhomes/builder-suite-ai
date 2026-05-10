## Goal

Make clicking the **PO Status** badge always open the same "PO Status Summary" table dialog (the perfect Matched view in screenshot 2), regardless of whether the status is `Matched`, `Over`, or `Draw`, and regardless of how many POs are linked.

## Why the two views look different today

In `src/components/bills/BillPOSummaryDialog.tsx`, when a bill resolves to a single PO and every bill line allocates to that one PO, the component short-circuits and renders `PODetailsDialog` instead of the summary table:

```ts
const allLinesResolveToSinglePO =
  matches.length === 1 &&
  billLines.every(l => resolveLineToPoId(l) === matches[0].po_id);

if (allLinesResolveToSinglePO && open) {
  return <PODetailsDialog ... />;
}
```

The "Over" City Concrete bill hits this branch (1 PO, all lines on it), so it shows the PODetailsDialog (screenshot 1) — which is missing the PO Number column, Lots column, Files column, the "PO Status Summary" header, and shows a literal "Matched" badge in the corner.

The "Matched" City Concrete bill in screenshot 2 has 2 POs, so the shortcut is skipped and it correctly renders the summary table.

## Change

Single edit in `src/components/bills/BillPOSummaryDialog.tsx`:

1. **Remove the single-PO shortcut block** (the `allLinesResolveToSinglePO` computation, the loading sub-dialog, and the `<PODetailsDialog ... />` early return). All bills — 1 PO or many, Matched or Over — will now render the same summary table that already supports:
   - "PO Status Summary" header + `Bill <ref> — N line items across M POs` subtitle
   - PO Number, Cost Code, Description, Lots (with hover popover), PO Amount, Billed to Date, This Bill, Remaining, Files, Status columns
   - Per-row Status badge (`Matched` / `Draw` / `Over`) computed from remaining cents — so the over bill correctly shows `Over` in red on each row

2. **Clean up the now-unused imports/derivations**: `PODetailsDialog`, `PendingBillLine` import, and the `derivedPendingBillLines` block (only consumed by the removed shortcut).

No other files change. `PODetailsDialog` itself is untouched and still used elsewhere (e.g. `PODetailsDialogWrapper`, edit/extract flows).

## Verification

- Click `Over` on the 33456 City Concrete bill → opens the summary table dialog with PO Number, Lots `+2` (hover shows lot breakdown matching Manage Bills format), Files icon, and a red `Over` Status badge per row. No "Matched" label anywhere.
- Click `Matched` on the 33606 bill → unchanged, still shows the same summary layout.
- Click a multi-PO bill → unchanged.
