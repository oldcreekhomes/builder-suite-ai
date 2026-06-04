## Goal

Replace the binary "reconciled ✓ / blank" column in the Account Detail dialog with an explicit three-state **Status** column that tells you, at a glance, how trustworthy each cost is:

| Badge | Meaning | Applies to |
|---|---|---|
| 🟡 **Pending** | Bill entered but not yet approved (draft). Tentative cost. | Bills only |
| 🔵 **Approved** | Posted to the books, but the money hasn't cleared the bank yet. | Approved bills (no payment, or payment not reconciled), unreconciled checks/JEs/CC charges/deposits |
| 🟢 **Cleared** | Bank-cleared. For bills: fully paid AND every payment is reconciled. For checks/JEs/etc.: own `reconciled` flag is true. | All row types |

The red 🔒 **Lock** column (closed period) is unchanged and remains independent.

## Files to change

### 1. `src/components/accounting/AccountDetailDialog.tsx`

**Data layer (around lines 440–540):**
- Already fetches `bills.status` and computes `derivedReconciled`. Keep both.
- On each transaction row, add a `status: 'pending' | 'approved' | 'cleared'` field derived as:
  - **Bill row:** `bill.status === 'draft'` → `pending`; else if `bill.reconciled || derivedReconciled` → `cleared`; else → `approved`.
  - **Check / JE / Credit-card / Deposit row:** `reconciled` → `cleared`; else → `approved`. (No `pending` for these — they're posted the moment they exist.)

**UI layer (lines ~1389–1393):**
- Rename the "Reconciled" column header to **"Status"**.
- Replace the single `Check` icon with a small badge component:
  - 🟡 `bg-amber-100 text-amber-800` "Pending"
  - 🔵 `bg-blue-100 text-blue-800` "Approved"
  - 🟢 `bg-green-100 text-green-800` "Cleared" (with a small check)
- Keep the column narrow; use icon + short text or icon-only with tooltip if width is tight (match existing density / `h-11` row standard).

**Lock column (lines ~1394–1420):**
- Lock still fires on `isDateLocked(txn.date) || isConsolidated`.
- Change: stop coupling lock to `txn.reconciled`. Locking is solely a closed-period concern now (workflow: reconcile → close → lock). This matches what you confirmed earlier in the thread.
- The `...` action menu remains hidden when locked (closed period or consolidated), same as today.

### 2. No DB migration

`bills.status`, `bill_payments.reconciled`, and `checks.reconciled` already exist. Pure presentation change on top of existing data plus the already-shipped `derivedReconciled`.

### 3. Memory update

Add a short memory under `mem://accounting/account-detail-status-model` documenting the three-state model and the rule that lock is independent of status. Update the index.

## Verification (on 923 17th Street → 4020 Project Manager)

- 2025 bills (Jul–Dec): 🟢 Cleared (bill.reconciled true). Lock shown if period closed.
- 02/03/26, 03/02/26, 03/31/26 bills: 🟢 Cleared (paid by reconciled checks).
- 05/03/26 bill: 🔵 Approved (paid by 05/07 check not yet reconciled).
- Any draft bill: 🟡 Pending.
- All checks/JEs: 🟢 Cleared if `reconciled`, else 🔵 Approved.
- 4045 Gas 03/03 reimbursement bill: 🟢 Cleared.

## Out of scope (call out, don't build)

- A "Cleared vs Open" subtotal on the parent Job Cost report. Worth doing later, but not part of this change.
- Changing how Manage Bills / Approve Bills shows status. This is dialog-only.
