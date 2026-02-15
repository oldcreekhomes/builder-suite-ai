

## Make Chart of Accounts Layout Match Cost Codes and Specifications

### Problem

The Chart of Accounts page has a completely different layout from Cost Codes and Specifications:
- A large "Import from QuickBooks" card with a drag-and-drop zone takes up half the page
- No search bar
- The heading/subheading section is separate from the import functionality

Cost Codes and Specifications both follow the same clean pattern:
1. Heading + subheading (left) with action buttons (right)
2. Search bar
3. Table

### Changes

**Restructure `ChartOfAccountsTab.tsx` to match the shared layout pattern:**

1. **Remove the large Import Card** -- no more `<Card>` with drag-and-drop zone taking up half the screen
2. **Add a header row** matching Cost Codes/Specifications:
   - Left side: "Chart of Accounts" heading + "Manage your chart of accounts (X accounts)" subheading
   - Right side: "Import IIF" button (small, outline style like the Excel Import button on Cost Codes) + "Add Account" button (primary, like Add Cost Code)
3. **Add a search bar** below the header, identical to Cost Codes and Specifications (`w-64`, search icon, "Search..." placeholder)
4. **Keep the IIF import functionality** -- the Import IIF button will trigger a hidden file input for `.iif` files (using the existing `useDropzone` logic but triggered by button click instead of drag-and-drop)
5. **Table stays exactly as-is** -- already standardized from the previous pass

### Visual Result

All three tabs will follow the exact same layout:

```text
+-------------------------------------------------------+
| Chart of Accounts                   [Import IIF] [+ Add Account] |
| Manage your chart of accounts (14 accounts)                      |
+-------------------------------------------------------+
| [Search icon] Search...                                          |
+-------------------------------------------------------+
| Code | Account Name | Type | Description | Actions              |
| 1010 | XYZ Bank     | Asset| --          | [edit] [delete]      |
| ...                                                              |
+-------------------------------------------------------+
```

### Technical Details

| File | Change |
|------|--------|
| `src/components/settings/ChartOfAccountsTab.tsx` | Remove the Card/drag-drop section. Restructure to: header row (heading + buttons) then search bar then table. Add search filtering on code/name. Keep IIF import as a button-triggered file picker. |

No new files needed. No other files affected.

