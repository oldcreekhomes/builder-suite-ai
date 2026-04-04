

## Add Missing Operating Expense Fields

### What's Missing
Comparing the attachment against the current Inputs page, these operating expense categories are not present:

1. **Landscaping / Snow Removal**
2. **Trash Removal**
3. **Pest Control**
4. **Security / Access Control**
5. **Professional Fees (Legal / Accounting)**
6. **Capital Expenditure Reserve**
7. **Other / Miscellaneous**

### Changes Required

**1. Database Migration**
Add 7 new columns to `apartment_inputs`, all `numeric` defaulting to `0`:
- `landscaping`
- `trash_removal`
- `pest_control`
- `security`
- `professional_fees`
- `capex_reserve`
- `other_misc`

**2. `src/hooks/useApartmentInputs.ts`**
- Add the 7 new fields to the `ApartmentInputs` interface and `DEFAULT_INPUTS`
- Include all 7 in the `computeFinancials` `totalOpEx` sum so they flow into NOI, DSCR, etc.

**3. `src/pages/apartments/ApartmentInputs.tsx`**
- Add `EditableRow` entries for each new field, distributed across the two Operating Expenses cards to keep columns balanced:
  - **Left card**: Add Landscaping, Trash Removal, Pest Control below Repairs & Maintenance
  - **Right card**: Add Security, Professional Fees, CapEx Reserve, Other/Misc below Reserves per Unit

**4. `src/integrations/supabase/types.ts`**
- Regenerate/update types to include the new columns

### Files Changed
- New migration SQL (7 columns)
- `src/hooks/useApartmentInputs.ts`
- `src/pages/apartments/ApartmentInputs.tsx`
- `src/integrations/supabase/types.ts`

