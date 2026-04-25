## Goal
Two refinements to the Send PO flow:

1. **Open the Confirm PO dialog immediately** when the user clicks Send PO — show a spinner inside the dialog while AI extraction runs (minimum 3 seconds). Remove the inline "✨ Creating PO with AI…" indicator from the row's Actions cell.
2. **Reclaim white space** in the Confirm PO line items table by doubling the **Qty** column width and pushing the **Proposal** column further right.

---

## 1. Move the spinner from the row → into the Confirm PO dialog

### `src/components/bidding/components/BiddingCompanyRow.tsx`
- In `handleOpenConfirmPO`, **open the dialog first**, then run extraction in the background:
  ```ts
  const handleOpenConfirmPO = async () => {
    setShowConfirmPODialog(true);
    if (!isReadOnly) {
      // Run extraction + minimum 3s delay in parallel; whichever takes longer wins
      const [lines] = await Promise.all([
        extract(biddingCompany.proposals, costCodeId),
        new Promise((r) => setTimeout(r, 3000)),
      ]);
      setExtractedLines(lines);
    }
  };
  ```
- Remove the `isExtracting` branch in the Actions `<TableCell>` — always render `<TableRowActions />`.
- Remove the now-unused `Sparkles` import.
- Pass a new `isExtracting` prop into `<ConfirmPODialog>` so the dialog knows when to show the spinner.

### `src/components/bidding/BiddingTableRow.tsx`
- Apply the same pattern in `handleSelectCompanyForPO`:
  ```ts
  const handleSelectCompanyForPO = async (company) => {
    setSelectedBiddingCompany(company);
    setShowSelectCompanyForPO(false);
    setShowConfirmPODialog(true);            // open immediately
    const [lines] = await Promise.all([
      extract(company.proposals, item.cost_code_id),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
    setExtractedLines(lines);
  };
  ```
- Track `isExtracting` locally (set true before, false in `finally`) and pass to `<ConfirmPODialog>`.

### `src/components/bidding/ConfirmPODialog.tsx`
- Add prop `isExtracting?: boolean`.
- When `mode === 'send' && isExtracting`, **replace the Line Items table** (and the message+Add Line row, footer buttons stay disabled) with a centered loading state:
  ```tsx
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <Sparkles className="h-8 w-8 text-primary animate-pulse" />
    <p className="text-sm text-muted-foreground">Creating PO with AI…</p>
  </div>
  ```
- Disable the **Send PO** button while `isExtracting` is true.
- When extraction finishes, the dialog seamlessly swaps to the populated line-items table (the existing `useEffect` on `initialLineItems` already handles seeding state).

---

## 2. Widen Qty column, push Proposal column right

### `src/components/bidding/ConfirmPODialog.tsx` — line items table
Current column widths (TableHead):
- Cost Code `w-[200px]`
- Description (flex)
- Qty `w-[40px]`
- Unit Cost `w-[110px]`
- Proposal `w-[70px]`
- Amount `w-[110px]`
- Extra `w-[60px]`
- Delete `w-[50px]`

Updates:
- **Qty** → `w-[80px]` (double current width). Inputs stay right-aligned.
- **Proposal** → keep `w-[70px]` but reorder so it sits immediately to the **left of Amount** (it already does in JSX, but verify Header + Body cell order matches: Cost Code → Description → Qty → Unit Cost → **Proposal** → Amount → Extra → Delete). The widening of Qty pushes Proposal visually to the right and eliminates the white space the user flagged.
- Update the subtotal row's `colSpan={5}` to remain correct (Cost Code + Description + Qty + Unit Cost + Proposal = 5 → unchanged).

No other layout changes; everything else (custom message + Add Line row, footer) stays as-is.

---

## Files touched
- `src/components/bidding/ConfirmPODialog.tsx` — add `isExtracting` prop, render spinner state, widen Qty column.
- `src/components/bidding/components/BiddingCompanyRow.tsx` — open dialog immediately, drop in-row spinner, pass `isExtracting`.
- `src/components/bidding/BiddingTableRow.tsx` — open dialog immediately, track + pass `isExtracting`.

No edge function or DB changes.
