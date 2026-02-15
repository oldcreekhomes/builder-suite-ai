

## Fix Template Dialog: Update Text and Close Behavior

### Problem
1. The `DialogDescription` text needs updating to remove "Get started in seconds, not hours." prefix -- should only read: "Cost codes are the foundation of your project budgets, bidding, and accounting. Choose how you'd like to get started:"
2. When clicking "Import from Excel" or "I'll add them manually", the template dialog stays visible behind the new dialog because `templateDialogOpen` is derived from `costCodes.length === 0` and cannot be manually overridden.

### Solution

**1. Update text in `CostCodeTemplateDialog.tsx` (line 43-45)**

Change the `DialogDescription` to:
> "Cost codes are the foundation of your project budgets, bidding, and accounting. Choose how you'd like to get started:"

**2. Add manual dismiss state in `CostCodesTab.tsx`**

- Add a `templateDismissed` state variable (default `false`)
- Change `templateDialogOpen` logic to: `costCodes.length === 0 && !loading && !templateDismissed`
- In `handleTemplateImportExcel` and `handleAddManually`, set `templateDismissed = true` before opening the next dialog
- Reset `templateDismissed` back to `false` when the Excel or Add dialog closes (so the template dialog reappears if user cancels without adding anything and still has zero cost codes)

### Files to modify

| File | Change |
|------|--------|
| `src/components/settings/CostCodeTemplateDialog.tsx` | Update DialogDescription text |
| `src/components/settings/CostCodesTab.tsx` | Add `templateDismissed` state; set it in handlers; reset on child dialog close |

