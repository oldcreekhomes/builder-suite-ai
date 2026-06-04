## Goal

Make it **impossible** to save two bills with the same reference number for the same vendor within a tenant — enforced both client-side (fast UX) and at the database (authoritative backstop).

## Why client-side alone failed

1. **Batch approve race** in `BillsApprovalTabs.handleSubmitAllBills` — every selected pending bill is checked against the DB *before* any are inserted, so two pending uploads with the same ref both pass.
2. **Cross-session / cross-tab race** — two approvals within seconds both read "no duplicate", both insert.
3. **Fail-open on error** — `checkDuplicate` returns `isDuplicate: false` on any network/RLS/timeout error, letting the bill through.

DB-confirmed: 32 duplicate `(owner_id, vendor_id, reference_number)` groups exist today, including ELG 356.

## Plan

### 1. Database constraint (authoritative)

Partial unique index on `bills`:

```sql
CREATE UNIQUE INDEX bills_unique_vendor_reference
  ON public.bills (owner_id, vendor_id, lower(btrim(reference_number)))
  WHERE reference_number IS NOT NULL
    AND btrim(reference_number) <> ''
    AND status <> 'void';
```

Scope = per tenant + per vendor, case- and whitespace-insensitive, ignores voided bills and blanks — matches the documented rule and today's client check.

### 2. Clean up the 32 existing duplicate groups so the index can be created

For each duplicate group, keep the **oldest** row untouched and rename every newer row's `reference_number` by appending ` (dup-N)` (N = 2, 3, …). This preserves all AP / cash history (important — many are already paid, including ELG 356) and keeps the bills visible and editable so you can resolve them with vendor credits or refund deposits as needed.

A console log lists the renamed bill IDs and old/new references so you have a paper trail.

### 3. Close the in-batch race in `BillsApprovalTabs.handleSubmitAllBills`

After the existing per-bill `checkDuplicate`, dedupe **within the batch itself**:

- Build a `Set<string>` of `${vendorId}::${lower(trim(ref))}` keys as bills move into `validatedBills`.
- A later bill in the same batch with an already-seen key goes into `duplicateBills` and shows the same toast — never reaches insert.

### 4. Stop failing open in `useReferenceNumberValidation.checkDuplicate`

On query error, return `{ isDuplicate: true, existingBill: { reason: 'lookup_failed' } }` and surface a toast: *"Could not verify invoice number uniqueness — try again."* Better to block one save than to admit a duplicate.

### 5. Translate the DB constraint error to a friendly toast everywhere bills are inserted

Add `formatDuplicateError(error)` to `useReferenceNumberValidation` that detects Postgres `23505` on constraint `bills_unique_vendor_reference`. Wire it into the catch path of:

- `src/components/bills/ManualBillEntry.tsx`
- `src/components/bills/ApproveBillDialog.tsx`
- `src/components/bills/EditBillDialog.tsx`
- `src/components/bills/EditExtractedBillDialog.tsx`
- `src/components/bills/BillsApprovalTabs.tsx` (around `batchApproveBills.mutateAsync`)
- `supabase/functions/recreate-bill/index.ts`
- The pending-bill RPC path in `src/hooks/usePendingBills.ts` (`approve_pending_bill`) — surface the 23505 from the RPC call site.

The existing client-side `checkDuplicate` calls stay in place as the fast UX path; the DB constraint is the backstop.

### 6. Update memory

Update `mem://business-logic/invoice-reference-uniqueness-per-vendor-migration` to record:
- Now enforced at the database via `bills_unique_vendor_reference` partial unique index.
- Scope: `(owner_id, vendor_id, lower(btrim(reference_number)))` where status ≠ 'void' and ref is non-blank.
- Client check is the UX layer; DB is the source of truth.
- Existing duplicates were renamed with ` (dup-N)` suffix, not voided.

## Out of scope

- Resolving the **real-world overpayment** of ELG 356. The duplicate bill row will remain (renamed) and you'll need to record a vendor credit or refund deposit in the app to clean up the cash side. Happy to walk through that separately.
- No change to the per-vendor scope. If you want **company-wide** uniqueness (same ref blocked across different vendors too), say so and I'll widen the index to `(owner_id, lower(btrim(reference_number)))`.
