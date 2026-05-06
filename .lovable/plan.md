## Restore "Resend to Review" on Rejected bills

The action was lost in a prior refactor of the Rejected row's `⋯` menu — not by request. Restoring it as it used to work.

### Change

**`src/components/bills/BillsApprovalTable.tsx`** — In the Rejected tab's row `⋯` menu, add **"Resend to Review"** as the first item (above Edit):
- Visible only when `bill.status === 'rejected'`.
- On click → opens a small confirm dialog with a required **Response Note** textarea (same UX as `EditBillDialog`'s "Send Bill Back for Review").
- On confirm → flips the bill to `status: 'draft'`, stamps the response note, invalidates `bills`, `bills-for-approval-v3`, `bill-approval-counts`. Toast: "Bill sent back for review".

### Hook

**`src/hooks/useBills.ts`** — Add a small `resendBillToReview(billId, note)` mutation (header-only update, no line round-trip). Reuses the existing `status: 'draft'` convention already in `updateBill`.

### Resulting Rejected row menu

```
Resend to Review
Edit
─────────────
Delete Bill
```

No DB schema changes. Frontend + hook only.
