

## Dynamic Operating Expenses with Balanced Columns

### Overview
Make operating expense line items addable/removable, and always keep the two columns level (balanced row counts, with any extra row on the left side).

### Design

**Fixed rows** (always shown, top of left column): Tax Rate, Estimated Value, Taxes (computed). These cannot be removed.

**Optional rows** (15 items): Insurance, Utilities, Repairs & Maintenance, Landscaping, Snow Removal, Trash Removal, Pest Control, Management Fee, General & Administrative, Marketing, Reserves per Unit, Security, Professional Fees, CapEx Reserve, Other / Miscellaneous. Each can be hidden or shown.

**Visibility storage**: Use `localStorage` keyed by project ID so preferences persist without a database change. Default: all items visible.

**Column balancing**: Collect all visible optional items into a single ordered list. Split into two columns: left gets `Math.ceil(n/2)` items, right gets the rest. The fixed rows (Tax Rate, Estimated Value, Taxes) always appear at the top of the left column, before the optional items assigned to it.

**Remove**: Each optional row gets a small `X` icon on hover (left of the label) to hide it. Hiding sets the field value to 0 in the database and removes it from view.

**Add**: An "Add Expense" button below the cards opens a dropdown/popover listing all currently hidden items. Clicking one adds it back to the visible list.

### Technical Details

```text
┌─ Operating Expenses ─────────┐  ┌─ Operating Expenses (cont.) ─┐
│ Tax Rate            0.01135  │  │ [optional item 1]            │
│ Estimated Value  $3,000,000  │  │ [optional item 2]            │
│ Taxes              $34,050   │  │ [optional item 3]            │
│ [optional item 1]            │  │ ...                          │
│ [optional item 2]            │  │                              │
│ [optional item 3]            │  │                              │
│ [optional item 4] ← extra    │  │                              │
└──────────────────────────────┘  └──────────────────────────────┘
                    [+ Add Expense]
```

### Files Changed
- `src/pages/apartments/ApartmentInputs.tsx` — Refactor operating expenses section to use a dynamic visible-items list, add remove (X) buttons, add "Add Expense" dropdown, and balance columns with `Math.ceil` split

