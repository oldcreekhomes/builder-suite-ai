

## Update Cost Code Template Dialog

### Changes

**1. Combine subheadings into one (`CostCodeTemplateDialog.tsx`)**

Merge the `DialogDescription` and the separate paragraph into a single `DialogDescription`:

> "Get started in seconds, not hours. Cost codes are the foundation of your project budgets, bidding, and accounting. Choose how you'd like to get started:"

Remove the separate `<p>` block that currently duplicates this content.

**2. Green checkmarks (`CostCodeTemplateDialog.tsx`)**

Change `CheckCircle2` class from `text-foreground` to `text-green-500`.

**3. Black borders on secondary buttons (`CostCodeTemplateDialog.tsx`)**

- "Import from Excel": add `border-foreground` class
- "I'll add them manually": change from `variant="ghost"` to `variant="outline"` with `border-foreground` class

**4. Make "Import from Excel" open the Excel dialog (`ExcelImportDialog.tsx`, `CostCodesHeader.tsx`, `CostCodesTab.tsx`)**

- Add optional `externalOpen` and `onExternalOpenChange` props to `ExcelImportDialog` so it can be controlled from outside (while keeping the trigger button for normal use)
- Pass these props through `CostCodesHeader`
- In `CostCodesTab`, add `excelDialogOpen` state; when template dialog's "Import from Excel" is clicked, set it to `true`

**5. Make "I'll add them manually" open the Add Cost Code dialog (`CostCodeTemplateDialog.tsx`, `CostCodesTab.tsx`)**

- Add an `onAddManually` prop to `CostCodeTemplateDialog`
- In `CostCodesTab`, wire it to set `addDialogOpen = true`

### Files to modify

| File | Changes |
|------|---------|
| `src/components/settings/CostCodeTemplateDialog.tsx` | Combined subheading, green checks, black borders, add `onAddManually` prop |
| `src/components/ExcelImportDialog.tsx` | Add optional controlled open props |
| `src/components/settings/CostCodesHeader.tsx` | Pass through excel dialog props |
| `src/components/settings/CostCodesTab.tsx` | Wire up excel and add-manually actions |

