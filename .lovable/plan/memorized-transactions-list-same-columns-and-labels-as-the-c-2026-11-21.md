# Memorized Transactions list: same columns and labels as the Credit Card screen

## New columns (left to right)
| Column | What it shows |
|---|---|
| **Vendor** | The vendor saved on the memorized charge (Pay To for checks) |
| **Description** | The line description, e.g. "Monthly AppleCare". Several lines are joined with commas. If there is none, it shows the memorized name, e.g. "Apple Care" |
| **Credit Card Account** | The card, e.g. "2150.0 - Capital One ...1234". Checks show their bank account |
| **Reference No.** | The reference number, or "-" |
| **Type** | Purchase / Refund for credit cards; Check / Bill for others |
| **Total** | The amount |
| **Frequency**, **Next Date**, **Status**, **Actions** | Unchanged |

- The old **Name** and **Card** columns go away, replaced by Vendor, Description and Credit Card Account as above.
- Labels are worded exactly as on the Credit Card screen: "Vendor", "Description", "Credit Card Account", "Reference No.", "Total".
- When the filter is **All Types**, the account column is called **Account**, because checks use bank accounts.
- Every row stays on one line; long text is cut off and you can hover to see all of it.

## Technical details
- `RecurringTransactionsContent.tsx`: use `table-fixed` with set widths.
  - Description comes from the `recurring_transaction_lines` memos (sorted by `line_number`), falling back to `rt.name`.
  - Vendor comes from `template_data.vendor || template_data.pay_to || template_data.payee`.
  - Account comes from `credit_card_account || bank_account`.
  - Reference No. comes from `template_data.reference_number`.
  - Type for credit cards comes from `template_data.transaction_type` (purchase/refund).
- The header label switches with the type filter.
