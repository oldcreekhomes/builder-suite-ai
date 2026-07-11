## Reconciliation Review polish

### 1. Deposit "Source" column — use the actual account
`deposits.company_name` is the depositor's own company info (from check settings), not the source. Real source is the account(s) on `deposit_lines` (e.g., "Construction Loan Proceeds", "Owner Contribution").

- Fetch `account_id` + `amount` on deposit lines and join to `accounts` to get `code - name`.
- Build the same breakdown structure used for cost codes: single account → plain text; multiple → first account + `+N` with a shadcn Tooltip breakdown (account, amount, total).
- Fallback to `memo` only if a deposit has no lines at all.

### 2. Remove underline when there are multiple cost codes / accounts
Drop `hover:underline` on the `+N` trigger button in `CostCodeCell` (and the new equivalent for accounts).

### 3. Remove "- Check" from Bill Payment type label
In the Debits table, change `'Bill Pmt - Check'` → `'Bill Payment'`.

### 4. Replace native `title=""` tooltips with shadcn Tooltip
The Description cell currently uses `title={t.description}` (browser HTML tooltip). Replace with the shadcn `<Tooltip>` so it matches app styling. Applies to both the Debits and Deposits Description cells.

### Scope
- Single file: `src/components/transactions/ReconciliationReviewDialog.tsx`.
- No DB or edge function changes.