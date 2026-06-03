## Fix

The `rejectApprovedBill` mutation in `src/hooks/useBills.ts` updates `posted_at: null`, but the `bills` table has no `posted_at` column — hence the schema cache error.

**Change:** Remove `posted_at: null` from the update payload. Keep `status='void'` and the notes append. That fully matches the existing `rejectBill` flow (which never touched `posted_at`) and still removes the bill from Approved → Rejected once the journal entries are deleted.

No schema migration needed.