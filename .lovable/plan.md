## Change

In `src/components/bills/EditBillDialog.tsx`, restore the Expense tab row visuals so the inputs match the height and spacing of the fields above (Vendor / Date / Reference No.):

- Widen the Account and Description cells to fill the space the removed Project column used to occupy (adjust `<TableHead>` widths back to comfortable defaults matching pre-change layout).
- Restore input heights on the Expense row so `AccountSearchInput`, the Description `Input`, Quantity, Unit Cost inputs render at the standard shadcn height (`h-10`) rather than the shrunken `h-8`/`h-7` variants — matching the Vendor/Date/Reference inputs above.
- Keep the trash button sized to match the row.
- No functional/business logic changes. Job Cost tab untouched.

## Why

Removing the Project column left the remaining inputs looking cramped/shorter than the top row. This restores the original visual rhythm.
