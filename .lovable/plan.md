## Plan: Cleaner Edit Extracted Bill row layout

### Changes (all in `src/components/bills/EditExtractedBillDialog.tsx`)

1. **Truncate Cost Code & Description**
   - Cost Code dropdown trigger: add `truncate` + `title={costCodeName}` so long names show `...` and reveal full text on hover.
   - Description input: add `truncate` styling and `title={description}` for hover preview.

2. **Quantity & Unit Cost → text-style inline editors (matching Total)**
   - Replace the bordered `<Input>` with a borderless, transparent-background input that looks like plain text:
     - `border-0 bg-transparent shadow-none focus-visible:ring-1 px-1 h-7 text-right`
   - Display formatted values (`0.30`, `$425.00`) — still fully editable on click/focus.
   - Visually matches the Total / Lot Cost columns (clean text, no boxes).

3. **Reclaim freed horizontal space**
   - Removing input chrome frees ~50–60px. Reallocate:
     - Cost Code: `180px → 210px`
     - Description: `200px → 240px`
   - Quantity / Unit Cost / Total widths stay the same since values now sit flush.

### Preserved
- Grouping logic, remainder absorption, 2-decimal rounding, lot tooltips, cent-precise saves in `updateJobCostGroup` — all unchanged.

### File modified
- `src/components/bills/EditExtractedBillDialog.tsx`
