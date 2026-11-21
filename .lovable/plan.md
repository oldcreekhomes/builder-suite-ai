# Memorized Transactions table cleanup + Edit for checks

## What changes
1. **Remove the Status column** completely. (Paused rows still show "Resume" in the actions menu so you can tell and undo.)
2. **Left-align everything except Actions** — Total moves to the left like the other columns.
3. **Type goes back to the real transaction name**: "Credit Card", "Check", "Bill" (no more "Purchase"/"Refund").
4. **Hover text uses the app's standard tooltip** instead of the browser's raw popup on Vendor, Description, Account and Reference No. — text stays truncated on one line, full text appears in the normal app tooltip.
5. **Edit for checks**: the Edit action now shows on memorized checks too. It opens the exact Write Checks screen (same fields, same labels), loaded with the memorized check, with Cancel + "Save Recurring" buttons that update the memorized check itself — same approach already used for credit cards, nothing reinvented.

## Technical details
- `RecurringTransactionsContent.tsx`: drop Status head/cell, remove `text-right` on Total, `typeOf` returns `formatType(...)`, wrap truncated cells in shadcn `Tooltip`, show Edit for `check` and `credit_card`, render `WriteChecksContent` or `CreditCardsContent` in the edit dialog by type.
- `WriteChecksContent.tsx`: add `recurringEdit` prop mirroring CreditCardsContent — hydrate from `template_data` + `recurring_transaction_lines`, hide toolbar/navigation, replace save buttons with Cancel / Save Recurring calling existing `updateRecurring` mutation.
- Bills: Edit stays hidden for memorized bills for now (no bill equivalent of this screen in this flow); can be added next if you want.
