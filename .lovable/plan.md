

## Plan: Add "CONTRACT SUMMARY" Title and Line-Item Breakdown Table to Page 1

### Changes to `SubcontractorContractForm.tsx`

**1. Add page title** — "CONTRACT SUMMARY" as a label above or replacing "SUBCONTRACT AGREEMENT"

**2. Set contract date default** to `"March 12, 2026"`

**3. Consolidate spacing** — Reduce `space-y-6` to `space-y-3` on Page 1 and tighten party block padding (`p-4` → `p-3`, `space-y-2` → `space-y-1`) so everything fits

**4. Replace the contract details grid** (lines 196-201) with a compact line-item table:

| Item | Description | Amount |
|------|------------|--------|
| A | General Conditions/Mobilization | $19,653.00 |
| B | Erosion Control | $20,382.00 |
| C | Site Demolition | $18,726.00 |
| D | Building Demolition | $22,489.00 |
| E | Clearing | $9,998.00 |
| F | Excavation and Grading | $282,578.00 |
| G | Sanitary | $129,546.00 |
| H | Storm Drain | $236,503.00 |
| I | Water | $86,259.00 |
| J | Site Concrete | $68,423.00 |
| K | Asphalt and Paving | $45,569.00 |
| | **TOTAL** | **$940,126.00** |

**5. Add `lineItems` to state** — Array of `{ letter, description, amount }` objects with pre-filled values. Add a `startDate` field below or beside the table.

**6. Render as a compact HTML table** with small text (`text-xs`), tight row padding, and a bold total row at the bottom. Amounts are editable inputs.

### Files Modified
- `SubcontractorContractForm.tsx` only

