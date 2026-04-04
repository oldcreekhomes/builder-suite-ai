

## Fix Operating Expenses: Remove Indent, Alphabetize, Balance Columns

### Problems
1. **Indentation**: The `RemovableEditableRow` has an X button that takes up space in the layout (`flex items-center gap-1`), pushing the label text to the right compared to the fixed rows above.
2. **Not alphabetical**: The optional expenses are listed in insertion order, not alphabetically.
3. **Unbalanced columns**: Current logic splits optional items 50/50 (`Math.ceil(15/2) = 8` left, `7` right), but ignores the 3 fixed rows (Tax Rate, Estimated Value, Taxes) in the left column. Left card ends up with 11 rows vs right with 7.

### Solution

**1. Remove indentation** -- Change the X button to use absolute positioning (e.g., `absolute -left-4`) so it doesn't affect the text flow. The label will align flush left, matching the fixed rows above it.

**2. Alphabetize** -- Sort the `OPTIONAL_EXPENSES` array alphabetically by label: CapEx Reserve, General & Administrative, Insurance, Landscaping, Management Fee, Marketing, Other / Miscellaneous, Pest Control, Professional Fees, Repairs & Maintenance, Reserves per Unit, Security, Snow Removal, Trash Removal, Utilities.

**3. Balance columns accounting for fixed rows** -- The left card always has 3 fixed rows. To balance total row counts: `leftOptionalCount = Math.ceil((totalVisible - 3) / 2)`, `rightCount = totalVisible - leftOptionalCount`. With 15 visible items: left gets 6 optional (9 total), right gets 9. Equal. With 14: left gets 6 (9 total), right gets 8 -- extra on left.

### File Changed
- `src/pages/apartments/ApartmentInputs.tsx`

