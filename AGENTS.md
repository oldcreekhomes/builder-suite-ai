# Project rules

- Cash Position uses one shared component with explicit dashboard scope applied before search and totals; this keeps both dashboard instances synchronized without copying accounting logic.

- Dense dashboard tables opt into the shared `.table-compact` utility defined once in `src/index.css` instead of setting their own row heights or cell padding; this keeps compact row density consistent across dashboards with a single edit.

- Multiple-check entry renders explicit split groups through `multiCheckGroups` while preserving flat draft allocations and the existing save payload; this keeps compact display, draft restoration, and posting consistent.
- Saved multiple-check summaries read persisted detail lines and attachments with paginated UUID-batched queries and use the universal file preview; this exposes complete saved details without changing accounting or duplicating file handling.
- Multiple-check batch retries resume retained per-check and per-file progress; this prevents reposting successful checks or silently discarding failed attachments.
- Check attachment removal deletes stored files only after a successful lookup confirms no remaining attachment references; this protects shared restored PDFs.
- Bank feeds go through the single `plaid` edge function: one `bank_connections` row per bank login, with its accounts in `bank_connection_accounts` mapped to job + book account. Access tokens live only in `bank_connections` with the token column withheld from client grants, so they never reach the browser. Re-signing into the same bank carries job links over by last-4 digits (`plaid/carryOver.ts`) and removes the old login once none of its links remain, so a re-sign-in never needs re-mapping.
- Reconciliation Review shows each saved `bill_payments` row at its saved `total_amount` (bills minus vendor credits) and skips any bank journal line whose bill has a cleared saved payment within the match window, in any reconciliation. Checking off a consolidated payment tags only its own entries: within the window, not already cleared elsewhere, and none for $0 payments. Both rules live in `src/lib/reconciliationPaymentRows.ts`, so a payment can never be counted in two months.
- Cost code pickers only show text that matches the selected cost code: typed text resolves through `src/lib/costCodeMatch.ts` on blur or reverts to the attached code, and Edit Bill blocks saving a mismatch; this prevents silently saving a stale code.
- Subscription invoice PDFs have two renderers (client `SubscriptionInvoicePdfDocument.tsx`, server `_shared/subscriptionInvoicePdf.ts`) that must stay visually identical; downloaded and auto-emailed invoices must match.
