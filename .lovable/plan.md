

## Plan: Enable Delete Button for Approved Bills

### Why It's Safe (Addressing Your Concern)
You're right that approved bills **do** have journal entries (the approval process posts them to the GL with WIP/Expense debits and A/P credits). However, the existing `delete_bill_with_journal_entries` database function already handles this correctly — it **hard-deletes both the bill AND all its journal entries + lines together**. Since both the debit and credit sides are removed simultaneously, the ledger stays balanced. No reversal is needed.

Reversals would only be necessary if payments had been made (because those create separate journal entries). Approved bills have no payments, so hard delete is the correct approach.

### Change
One line in `src/components/bills/BillsApprovalTable.tsx` (~line 714):

Add `'approved'` to the `canShowDeleteButton` status whitelist so the Delete action appears on the Approved tab. The existing `can_delete_bills` permission still governs who sees it, and the `delete_bill_with_journal_entries` RPC handles the cascading cleanup.

