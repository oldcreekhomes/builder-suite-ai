
## Replicate Cost Code Template Dialog for Chart of Accounts

### Overview

Copy the exact same "Set Up" dialog pattern from Cost Codes to Chart of Accounts. When a home builder has zero accounts, a dialog automatically appears with three options: Use Our Template, Import from QuickBooks (IIF), or Add Manually. Once any account exists, the dialog disappears. If all accounts are deleted, it reappears.

### User Experience

Identical to the Cost Codes dialog but with "chart of accounts" language:
- Title: "Set Up Your Chart of Accounts"
- Description: "Your chart of accounts is the foundation of your project accounting and financial reporting. Choose how you'd like to get started:"
- **Use Our Template** (primary) -- copies ~20 accounts from Old Creek Homes template
- **Import from QuickBooks** -- closes dialog, opens the existing IIF import section (scrolls to it or highlights it)
- **I'll add them manually** -- closes dialog, opens the Add Account dialog
- Same green checkmarks, same black borders on secondary buttons

The checklist items for "Use Our Template" will be: "Account codes & names", "Account types", "Descriptions", "Ready-to-use structure"

### Technical Details

**1. New Edge Function: `copy-template-accounts`**

- Same authentication pattern as `copy-template-cost-codes`
- Reads all accounts from Old Creek Homes (`owner_id = '2653aba8-d154-4301-99bf-77d559492e19'`) where `is_active = true`
- Inserts copies with new UUIDs into the requesting user's account, preserving: `code`, `name`, `type`, `description`, `is_active`
- Handles `parent_id` remapping (old ID to new ID) for any hierarchical accounts
- Returns count of imported accounts

**2. New Component: `src/components/settings/ChartOfAccountsTemplateDialog.tsx`**

- Mirrors `CostCodeTemplateDialog.tsx` exactly in structure
- Props: `open`, `onOpenChange`, `onUseTemplate`, `onImportQuickBooks`, `onAddManually`
- Same visual design: recommended section with green checkmarks, black-bordered secondary buttons
- Text adapted: "chart of accounts" instead of "cost codes", benefits list updated for accounting context

**3. Update `src/components/settings/ChartOfAccountsTab.tsx`**

- Add `templateDismissed` state (same pattern as CostCodesTab)
- Compute `templateDialogOpen = accounts.length === 0 && !isLoading && !templateDismissed`
- "Use Template" calls the new edge function, then invalidates the `['accounts']` query
- "Import from QuickBooks" dismisses the template dialog (the IIF import card is already visible on the page beneath)
- "Add Manually" dismisses the template dialog and opens the `AddAccountDialog`
- Reset `templateDismissed` when the Add dialog closes (so template reappears if user cancels without adding)

**4. Config update: `supabase/config.toml`**

- Add `[functions.copy-template-accounts]` entry

### Files to create/modify

| File | Action |
|------|--------|
| `supabase/functions/copy-template-accounts/index.ts` | Create -- edge function to copy Old Creek Homes accounts |
| `supabase/config.toml` | Modify -- add function config entry |
| `src/components/settings/ChartOfAccountsTemplateDialog.tsx` | Create -- the welcome/template dialog component |
| `src/components/settings/ChartOfAccountsTab.tsx` | Modify -- integrate the template dialog |
