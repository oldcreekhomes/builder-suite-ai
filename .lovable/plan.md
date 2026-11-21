# Memorized credit cards: Edit action + Card column

## 1. Edit action
- The "..." menu on each memorized transaction gets **Edit**, above Pause and Delete.
- Edit opens a large window containing the actual Credit Card screen: the same Purchase/Refund switch, Credit Card Account, Vendor, Reference No., Chart of Accounts / Job Cost lines, quantities, costs and lots. It is the same screen, not a copy, so any future change to the credit card screen appears here automatically.
- The window opens filled in with the memorized charge.
- At the bottom, the normal posting buttons are replaced by **Cancel** and **Save Recurring**. Save Recurring updates the memorized template itself, header and all lines. It does **not** post a charge.
- The list refreshes right away with the new amount and card.
- Name, frequency and next date stay as they are. They are not part of the credit card screen.

## 2. Card column
- A new **Card** column goes between Name and Type, showing the credit card account saved on that memorized charge (for example "2010 - Capital One ...1234").
- It's read from each memorized transaction itself, so it's specific to that job and that transaction.
- Checks and bills show their bank or "-".

## Technical details
- `CreditCardsContent` gets a `recurringEdit?: { template: RecurringTransaction; onSaved(); onCancel() }` mode:
  - On mount it hydrates state from `template_data` + `recurring_transaction_lines`, using the same row-building code as loading a saved card.
  - It hides the header toolbar (Search/New/arrows/delete/date) and the posting footer.
  - Its save builds the same `templateData` + `lines` it already passes to `MemorizeTransactionDialog`, then calls a new `updateRecurringTransaction` mutation in `useRecurringTransactions`. That mutation updates `template_data` and deletes and re-inserts `recurring_transaction_lines`.
- `reference_number` is added to the memorized `templateData`, so memorizing and editing keep it.
- `RecurringTransactionsContent`: add an Edit action that opens a `Dialog` (`max-w-[95vw]`) rendering `<CreditCardsContent projectId={rt.project_id} recurringEdit=... />` for credit card templates. Add the Card column from `template_data.credit_card_account` (bank account label for checks).
