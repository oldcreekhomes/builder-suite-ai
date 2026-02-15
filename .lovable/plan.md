

## Template Cost Code Import Dialog for New Home Builders

### Overview

When a home builder navigates to the Cost Codes tab and has zero cost codes, a welcome dialog automatically appears offering three options to get started. The primary (recommended) option copies all ~300 cost codes (plus ~76 specifications) from Old Creek Homes into the new builder's account. The dialog simply checks `costCodes.length === 0` -- no database flag needed. Once any cost code exists, the dialog never shows again.

### User Experience

The dialog presents three clearly ranked options:

1. **Use Our Template (primary, visually prominent black button)** -- One click imports ~300 pre-configured cost codes with specifications, bidding settings, subcategories, and estimates already set up. Copy emphasizes saving hours of manual entry and that everything can be edited afterward.
2. **Import from Excel** -- Opens the existing Excel import dialog for users who have their own spreadsheet.
3. **Add Manually** -- Closes the dialog so they can use the Add Cost Code button at their own pace.

Key messaging includes:
- "Get started in seconds, not hours"
- Bullet list of what's included: cost codes, specifications, bidding settings, subcategories, estimates
- Reassurance: "You can edit, add, or remove any cost code at any time. Once imported, these become entirely yours."

### Technical Details

**1. New Edge Function: `copy-template-cost-codes`**

- Authenticates the requesting user via JWT
- Reads all 300 cost codes from Old Creek Homes (`owner_id = '2653aba8-d154-4301-99bf-77d559492e19'`)
- Inserts copies with new UUIDs into the requesting user's account, preserving: `code`, `name`, `category`, `parent_group`, `quantity`, `price`, `unit_of_measure`, `has_specifications`, `has_bidding`, `has_subcategories`, `estimate`
- Also copies the ~76 `cost_code_specifications` rows, re-mapping `cost_code_id` from old to new IDs (copies `description` only, not `files` since those reference Old Creek's storage)
- Returns the count of imported cost codes and specifications

**2. New Component: `src/components/settings/CostCodeTemplateDialog.tsx`**

- A Dialog component with props: `open`, `onOpenChange`, `onUseTemplate`, `onImportExcel`
- Three action paths:
  - "Use Our Template" -- large black button with arrow, calls `onUseTemplate` (shows loading state during import)
  - "Import from Excel" -- secondary outline button, calls `onImportExcel`
  - "Add Manually" -- text/link style, closes dialog
- Compelling copy about time savings and editability

**3. Update `src/components/settings/CostCodesTab.tsx`**

- Add state for `templateDialogOpen`, derived from `costCodes.length === 0 && !loading`
- When "Use Template" is clicked: call the edge function, then trigger a refetch of cost codes (the parent component's query will re-run, populating the table and preventing the dialog from reappearing)
- When "Import Excel" is clicked: close template dialog, programmatically open the Excel import dialog
- When "Add Manually" or dismiss: just close the dialog (it will reappear next time if they still have zero cost codes, which is the desired behavior per the user's request)

**4. Config update: `supabase/config.toml`**

- Add `[functions.copy-template-cost-codes]` with `verify_jwt = false` (auth validated in code)

### Files to create/modify

| File | Action |
|------|--------|
| `supabase/functions/copy-template-cost-codes/index.ts` | Create -- edge function to copy Old Creek Homes cost codes + specifications |
| `supabase/config.toml` | Modify -- add function config entry |
| `src/components/settings/CostCodeTemplateDialog.tsx` | Create -- the welcome/template dialog component |
| `src/components/settings/CostCodesTab.tsx` | Modify -- integrate the template dialog, show when `costCodes.length === 0` |

No database migration needed -- the trigger is purely based on the cost codes array length passed as a prop.

