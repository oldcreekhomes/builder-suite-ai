
Goal
- Restore “combined payment” behavior in the Bank Account register (Account Detail dialog) so a single real-world bank-clearing payment shows as one line with an “+N” indicator and a hover tooltip that lists the included items, instead of incorrectly showing multiple separate “Bill Pmt - Check” rows.

What’s happening (root cause)
- The screenshot is the bank account register modal: `src/components/accounting/AccountDetailDialog.tsx`.
- That dialog currently renders rows directly from `journal_entry_lines` for the selected account.
- For multi-bill payments, that means you can end up with multiple journal-entry-line rows (often one per bill/allocation) even though the bank statement shows a single cleared payment.
- The consolidation logic (single row + tooltip) exists in reconciliation land (`src/hooks/useBankReconciliation.ts`), but the bank account register dialog never applied the same consolidation rules.

High-level solution
- In `AccountDetailDialog.tsx`, detect consolidated payments using the `bill_payments` + `bill_payment_allocations` tables (the “consolidated bill payments” architecture you already use for reconciliation).
- Hide the underlying per-bill “bill_payment” journal-entry-line rows when they belong to a consolidated payment.
- Insert one synthetic “consolidated bill payment” row per `bill_payments` record so the register shows the correct single payment amount.
- Add back the “+N” indicator + hover tooltip on the Account column for these consolidated rows, listing what’s inside (reference numbers + allocated amounts).

Files to inspect/change
1) `src/components/accounting/AccountDetailDialog.tsx`
   - Add fetching + merging logic for consolidated bill payments.
   - Add tooltip UI on the Account cell when a transaction has multiple included items.
   - Add a new source_type handling: `consolidated_bill_payment`.

2) (Optional small helper, only if needed to keep component clean)
   - `src/utils/...` (a tiny formatter/helper) — only if the existing file gets too large; otherwise keep inline to minimize surface area.

Detailed implementation steps
A) Extend the Transaction model used by the dialog
- In `AccountDetailDialog.tsx`, extend the local `Transaction` interface to support:
  - `source_type: 'consolidated_bill_payment' | existing string union`
  - `includedBillPayments?: Array<{ bill_id: string; reference_number: string | null; amount_allocated: number }>`
  - `isConsolidated?: boolean` (boolean flag for rendering decisions)
- Ensure existing rows still work unchanged.

B) Fetch consolidated bill payments for this bank account within the same queryFn
Inside the `useQuery` queryFn (where it currently fetches `journal_entry_lines`):
1. If `accountId` is set, also query `bill_payments`:
   - Filter: `.eq('payment_account_id', accountId)`
   - Apply project filter the same way you already do elsewhere:
     - if `projectId` provided: `.eq('project_id', projectId)`
     - else: `.is('project_id', null)`
   - Apply `asOfDate` if present:
     - `.lte('payment_date', yyyy-mm-dd)`
2. Fetch allocations from `bill_payment_allocations` for those `bill_payments` IDs:
   - Select: `bill_payment_id, bill_id, amount_allocated, bills:bill_id(reference_number)`
3. Build:
   - `allocationsByPaymentId: Map<paymentId, includedItems[]>`
   - `billIdsInConsolidatedPayments: Set<bill_id>` (used to suppress legacy rows)

C) Suppress the duplicated legacy “bill_payment” rows
- You currently build `filteredData` from journal entry lines.
- Add an additional filter:
  - If `line.journal_entries.source_type === 'bill_payment'` AND `billIdsInConsolidatedPayments.has(line.journal_entries.source_id)` then exclude that line.
- Result: the register will no longer show the 3 separate “Bill Pmt - Check” rows that actually belong to one consolidated payment.

D) Create synthetic rows for each consolidated payment
- For each `bill_payments` row:
  - Create a `Transaction` object shaped like the existing ones so the table can render it.
  - Set:
    - `source_id = bill_payment.id`
    - `line_id = 'consolidated:' + bill_payment.id` (unique stable key)
    - `journal_entry_id = 'consolidated:' + bill_payment.id` (unique stable key)
    - `date = payment_date`
    - `reference = vendor name` (fetch vendor names from `companies` by `vendor_id`, similar to reconciliation)
    - `description = memo or check_number` (match existing UX)
    - `debit/credit`: for a bank account (asset), money going out should display negative. The dialog’s existing amount calc for assets is `debit - credit`, so use:
      - `debit = 0`
      - `credit = total_amount`
    - `source_type = 'consolidated_bill_payment'`
    - `includedBillPayments = allocationsByPaymentId.get(id) || []`
- Merge these synthetic rows into the `transactions` array before sorting.

E) Compute the Account column display + “+N” indicator + tooltip
- For consolidated rows only:
  1. Determine a “primary” account label to show (left side of Account column):
     - Fetch bill lines for all `bill_id` present in the allocations:
       - `bill_lines`: select `bill_id, line_number, cost_code_id, account_id`
       - Choose primary from the first bill’s first line (by line_number).
       - Prefer `cost_code` display (code-name) when present; otherwise fallback to `accounts` display.
  2. Compute extra count:
     - `extraCount = includedBillPayments.length - 1`
     - If `extraCount > 0`, show `PrimaryLabel` plus a muted `+{extraCount}` badge/text.
  3. Tooltip content:
     - On hover of the `+N` (or the whole Account cell), show a small list like:
       - `Ref# 06252025 — $100.00`
       - `Ref# 07142025 — $776.00`
       - `Ref# Payment for bill — $4,950.00` (or blank reference fallback)
     - Show a total line at the bottom that equals `bill_payments.total_amount` (source of truth).

UI implementation approach (consistent with current stack)
- Use existing tooltip components:
  - `Tooltip`, `TooltipTrigger`, `TooltipContent` from `src/components/ui/tooltip.tsx`
- Render logic in the Account cell:
  - If `txn.source_type === 'consolidated_bill_payment'` and `extraCount > 0`, wrap the `+N` in a TooltipTrigger and show TooltipContent with breakdown.
  - Keep the cell visually similar to the rest of the table (no underlines/dots).

F) Ensure labels and actions behave safely
- Update the “Type” label mapping in `AccountDetailDialog.tsx`:
  - treat `consolidated_bill_payment` as `Bill Pmt - Check`
- Disable inline edits and deletion for consolidated rows (initially):
  - The dialog’s inline edit + delete handlers don’t support bill_payments today and we should avoid accidental data corruption.
  - For consolidated rows:
    - Make date/reference/description inline editors render as plain text (read-only)
    - Hide Delete button in Actions column
- This keeps behavior correct and prevents creating new bugs while restoring the reconciliation-critical display.

Testing checklist (acceptance)
1. Create a multi-bill consolidated payment (one bank-clearing amount).
2. Open the bank account register (Account Detail dialog) for the bank account.
3. Confirm:
   - Only one “Bill Pmt - Check” row appears for that combined payment date/vendor.
   - The Amount equals the single bank-clearing amount (e.g., $5,826.49) and the running balance matches expectations.
   - Account column shows “Primary account +2” (or appropriate count).
   - Hover tooltip lists all included items with amounts and a total matching the payment total.
4. Verify a normal single-bill payment still renders as a single row without tooltip.
5. Regression check: deposits/checks/credit-card/manual journal entries still render as before.

Potential edge cases handled
- Bills in the allocations missing reference_number: show “(No ref)” or “Bill” in tooltip.
- Allocations order: sort tooltip lines by reference_number or by amount descending for readability.
- asOfDate filtering: consolidated payments respect the asOfDate cutoff so historical reports don’t shift.
- Project vs company-wide scoping: match current dialog behavior (project lines AND null project_id lines) where appropriate, but keep bill_payments scoped like reconciliation (project-specific vs null).

Out of scope (for this fix)
- Allowing inline editing/deleting of consolidated bill payments from the register (can be added later with dedicated mutations + safeguards).
- Changing the register to QuickBooks-style Debit/Credit columns (separate request; currently it shows single Amount).

Deliverable
- Bank account register displays combined payments correctly again (single line + +N tooltip breakdown), making reconciliation and auditability accurate and user-trustworthy.
