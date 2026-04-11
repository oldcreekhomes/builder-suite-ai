

## Plan: Recurring (Memorized) Transactions

### What We're Building
A "Memorized List" feature — identical in concept to QuickBooks — that lets you save any Check, Credit Card Charge, or Bill as a recurring template. Each month, pending recurring transactions appear for review and one-click approval before being entered into the ledger.

### Database Changes (2 new tables via migration)

**`recurring_transactions`** — stores the template
- `id`, `owner_id`, `transaction_type` (check | credit_card | bill), `name` (display label, e.g. "OST Consulting - Project Mgr")
- `frequency` (monthly | weekly | quarterly | annually), `next_date`, `end_date` (optional)
- `auto_enter` (boolean — auto-post or require approval)
- `template_data` (JSONB — full snapshot of header fields: pay_to, bank_account_id, vendor_id, check_number, memo, amount, project_id, etc.)
- `is_active`, `created_at`, `updated_at`
- RLS: owner_id = current user's owner

**`recurring_transaction_lines`** — stores line items for the template
- `id`, `recurring_transaction_id` (FK), `line_type` (job_cost | expense)
- `account_id`, `cost_code_id`, `project_id`, `lot_id`, `quantity`, `amount`, `memo`, `line_number`

### UI Components

1. **"Memorize" button** on Write Checks, Credit Cards, and Bills entry forms (in the footer bar next to Save/Clear). Clicking opens a small dialog to set frequency, next date, and a display name. Saves the current form state as a recurring template.

2. **Memorized Transactions List** — new sidebar item under Transactions called "Recurring". Shows a table similar to the QuickBooks screenshot: Transaction Name, Type, Source Account, Amount, Frequency, Next Date, Auto, and Actions (edit/delete/enter now). Filterable by type.

3. **Pending Recurring Transactions** — on the Transactions page (or as a banner/badge), show transactions that are due. User clicks to review the pre-filled form, then saves as a normal transaction. This is the "verify before entering" workflow you described.

### Hooks & Logic

- `useRecurringTransactions.ts` — CRUD for recurring templates, plus a query for "due" transactions (where `next_date <= today` and `is_active = true`)
- When a recurring transaction is entered (approved), the hook advances `next_date` by the frequency interval
- `createFromRecurring()` — takes a template, pre-fills the appropriate form (check/CC/bill), and lets the user confirm before saving

### Workflow

1. User writes a check as normal (e.g., OST Consulting, $2,500, Job Cost lines)
2. Clicks **"Memorize"** → dialog asks: Name, Frequency (Monthly), Next Date (May 1), Auto-enter? (No)
3. Template saved. Next month, it appears in the Recurring list as "due"
4. User opens it → form pre-fills with all fields → user verifies → clicks Save Entry
5. `next_date` advances to June 1

### Files to Create
- `supabase/migrations/XXXX_create_recurring_transactions.sql`
- `src/hooks/useRecurringTransactions.ts`
- `src/components/transactions/MemorizeTransactionDialog.tsx`
- `src/components/transactions/RecurringTransactionsContent.tsx`
- `src/components/transactions/PendingRecurringBanner.tsx`

### Files to Modify
- `src/components/transactions/TransactionsTabs.tsx` — add "Recurring" sidebar item
- `src/components/transactions/WriteChecksContent.tsx` — add Memorize button + load-from-template capability
- `src/components/transactions/CreditCardsContent.tsx` — same
- `src/components/bills/` (bill entry form) — same

