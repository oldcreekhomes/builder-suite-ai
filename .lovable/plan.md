

## Fix Cost Code Template Import: Add Price History + Update Dialog

### Problem
When a new user imports cost codes via "Use Our Template," the edge function (`copy-template-cost-codes`) copies cost codes and specifications but **skips the `cost_code_price_history` table**. This means imported cost codes don't have any price history data -- the Price History graph shows flat or empty data instead of matching Old Creek Homes' actual history.

### Changes

**1. Add green checkmark to template dialog (`src/components/settings/CostCodeTemplateDialog.tsx`)**
- Add "Current Local Subcontractor Prices" to the benefits list (the array of green checkmark items)
- Updated list: `['Cost codes & categories', 'Current Local Subcontractor Prices', 'Specifications', 'Bidding settings', 'Subcategories', 'Estimates']`

**2. Update the edge function to also copy price history (`supabase/functions/copy-template-cost-codes/index.ts`)**
- After inserting cost codes and specifications, fetch all `cost_code_price_history` records for the template owner's cost codes
- Map each record to the new cost code IDs using the existing `idMap`
- Insert the copied price history records with the new owner's cost code IDs, preserving `changed_at`, `price`, `unit_of_measure`, and `notes` fields
- Skip `file_path` (attachments are owner-specific and shouldn't be copied)
- Process in batches to handle large datasets

**3. Reset Erica Gray Homes' onboarding step**
- This is a data-level action: delete all cost codes owned by Erica Gray Homes so the template dialog reappears and the user can reimport with the fix applied

### Technical Details

New section in the edge function (after specifications insert, before the success response):

```text
// Fetch price history for all template cost codes
// Map cost_code_id using idMap to new IDs
// Insert with: cost_code_id (mapped), price, unit_of_measure, changed_at, notes
// Skip: file_path (not transferable between owners)
// Batch insert in groups of 100
```

The existing `idMap` (old template cost code ID to new user cost code ID) is reused for this mapping, so no additional lookups are needed.

