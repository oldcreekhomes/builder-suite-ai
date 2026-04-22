

## Fix: "Edit Description" not persisting on Bill Pmt - Check rows

### Root cause
The Account Detail register builds the **Description** column for bill-payment rows from a different table than what `EditDescriptionDialog` writes to:

| Row type (source_type) | Description shown comes from | Dialog currently writes to |
|---|---|---|
| `bill_payment` (single-bill payment) | `bill_lines[0].memo` of the underlying bill (`AccountDetailDialog.tsx` line 742) | `journal_entry_lines.memo` only |
| `consolidated_bill_payment` (synthetic row) | `bill_payments.memo` (line 810); `journal_entry_id` is the synthetic string `consolidated:<id>` | `journal_entry_lines.memo` keyed by that fake id → no rows updated |
| `bill` | `bill_lines[0].memo` | `bill_lines` first row ✅ (works) |
| `check` / `deposit` / `credit_card` | first line's memo | corresponding `*_lines` first row ✅ (works) |

So for "Bill Pmt - Check" the save runs without error but updates nothing the UI re-reads → the dialog reopens showing the old text.

### Fix (one file)
`src/components/accounting/EditDescriptionDialog.tsx` — make the write target match the read source for the two payment types:

1. **`sourceType === 'bill_payment'`** (single-bill payment):
   - `sourceId` here is the bill's id (per `AccountDetailDialog` line 739, `billsMap.get(line.journal_entries.source_id)`).
   - Update `bill_lines.memo` for the first line of that bill (same path the `'bill'` branch already uses): set `lineTable = 'bill_lines'`, `parentColumn = 'bill_id'`.
   - Also keep updating `journal_entry_lines.memo` for that journal entry so the GL ledger view stays in sync.

2. **`sourceType === 'consolidated_bill_payment'`**:
   - `sourceId` is the `bill_payments.id`; `journalEntryId` is the synthetic `consolidated:<id>` string and must NOT be used as a real id.
   - Update `bill_payments.memo` directly: `supabase.from('bill_payments').update({ memo: description }).eq('id', sourceId)`.
   - Skip the `journal_entry_lines` write when `journalEntryId.startsWith('consolidated:')` (no real JE row exists for the synthetic consolidated row).
   - Invalidate `['account-transactions']` and `['bill-payments-reconciliation']` so both the register and the reconciliation view refresh.

3. Keep all other branches (`bill`, `check`, `deposit`, `credit_card`, `manual`) unchanged.

4. After save, the existing `onSaved(newDescription)` callback already patches `selectedTransaction.description` locally, and the React Query invalidation will refetch the register — both will now show the new text.

### Verification
- Open Reports → Balance Sheet → click `1010 - Atlantic Union Bank` → click an "Anchor Poolscapes" Bill Pmt - Check row → Edit Description → change to "Payment due upon contract completion" → Save → reopen the same row: new description persists.
- Repeat on a consolidated multi-bill payment row: edit, save, reopen — persists.
- `bill`, `check`, `deposit`, `credit_card`, manual JE descriptions still save and persist as today.
- Underlying GL ledger (Journal Entry detail) reflects the same updated memo for non-consolidated edits.

### Files touched
- `src/components/accounting/EditDescriptionDialog.tsx` only. No schema changes.

