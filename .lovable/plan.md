
Fix the reconciliation “Account” column by correcting the legacy bill-payment data mapping in `src/hooks/useBankReconciliation.ts`.

What’s actually broken
- The newer partial-payment logic is already creating bill-payment rows correctly from `journal_entry_lines`, using the JE line id as the transaction id.
- But later in the same hook there is an older leftover block (around lines 1177-1241) that still treats `bp.id` like a `bill_id`.
- That stale block queries `bill_lines` with JE line ids, gets no matches, then overwrites previously-built `allocations` with `[]`.
- That explains the screenshot: some rows still show an account if `accountAllocations` survived, but many rows fall back to `-` because their cost-code data got wiped out.

Plan
1. Remove or rewrite the stale post-processing block so legacy bill payments are never re-keyed by `bp.id`.
2. Keep the earlier legacy bill-payment enrichment as the source of truth:
   - `allocations` from `bill_lines.cost_code_id`
   - `accountAllocations` from `bill_lines.account_id`
   - JE debit-line fallback for missing account data
3. Strengthen the fallback so it can backfill `accountAllocations` when the account side is missing, without erasing existing cost-code allocations.
4. Leave `ReconcileAccountsContent.tsx` alone unless a tiny safety tweak is needed, because the renderer is already correct:
   - show `accountAllocations` first
   - otherwise show `allocations`
5. Regression-check the affected cases:
   - partial bill payments still appear as separate rows
   - rows with only cost codes show the cost code instead of `-`
   - rows with GL accounts show the account
   - consolidated bill payments still behave the same

Technical details
- Main file: `src/hooks/useBankReconciliation.ts`
- Primary fix area: legacy bill-payment enrichment and the stale overwrite block near lines 1177-1241
- No database changes
- No UI redesign needed

Expected result
- The reconciliation Account column will consistently show either the GL account or the cost code for bill payments, instead of intermittently rendering `-`.
