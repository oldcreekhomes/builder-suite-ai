

## Transaction Detail Dialog

**Problem**: Table columns truncate text (Name, Account, Description), making it hard to see full details. There's no way to view attached files (PDFs) from the register.

### Solution

Create a `TransactionDetailDialog` that opens when clicking a row, showing all transaction fields untruncated, plus any attached files that can be previewed.

### Changes

**New file: `src/components/accounting/TransactionDetailDialog.tsx`**

A dialog that receives a `Transaction` object and displays:
- **Header**: Type label + date
- **Detail grid** (label/value pairs, full width, no truncation):
  - Type, Date, Name, Account, Description/Memo, Amount (debit/credit), Balance, Cleared status, Reconciliation date
- **Attachments section**: Fetches files from the appropriate attachments table based on `source_type`:
  - `bill` / `bill_payment` → `bill_attachments` (by `bill_id = source_id`)
  - `check` → `check_attachments` (by `check_id = source_id`)
  - `deposit` → `deposit_attachments` (by `deposit_id = source_id`)
  - `credit_card` → `credit_card_attachments` (by `credit_card_id = source_id`)
  - `manual` → `journal_entry_attachments` (by `journal_entry_id`)
- Each attachment shows file icon + full name, clickable to open via `useUniversalFilePreviewContext` (using `openBillAttachment`, `openCheckAttachment`, etc.)

**Modified: `src/components/accounting/AccountDetailDialog.tsx`**
- Add state: `selectedTransaction: Transaction | null`
- Make each `TableRow` clickable (`onClick` → set selected transaction, `cursor-pointer hover:bg-muted/50`)
- Render `<TransactionDetailDialog>` at the bottom, passing the selected transaction, balance value, and account type
- Pass `accountType` so the detail dialog can format the amount correctly

**No wrapper changes needed** — `AccountDetailDialog` is already inside `UniversalFilePreviewProvider` via the Reports page hierarchy.

### Detail Dialog Layout

```text
┌─────────────────────────────────────────┐
│  Transaction Details              [X]   │
├─────────────────────────────────────────┤
│  Type:        Bill Pmt - Check          │
│  Date:        11/03/2025                │
│  Name:        Rimble Landscaping LLC    │
│  Account:     4860 - Lawn Mowing        │
│  Description: 157106                    │
│  Amount:      ($97.50)                  │
│  Balance:     $27.27                    │
│  Cleared:     ✓ Yes                     │
│                                         │
│  ─── Attachments ───                    │
│  📄 Invoice_157106.pdf    [Preview]     │
│  📄 Receipt.pdf           [Preview]     │
│                                         │
│  (or "No attachments found")            │
└─────────────────────────────────────────┘
```

### Attachment Query Logic (inside the detail dialog)

```typescript
// Determine table and foreign key based on source_type
const getAttachmentQuery = (txn: Transaction) => {
  switch (txn.source_type) {
    case 'bill':
    case 'bill_payment':
      return { table: 'bill_attachments', key: 'bill_id', value: txn.source_id };
    case 'check':
      return { table: 'check_attachments', key: 'check_id', value: txn.source_id };
    case 'deposit':
      return { table: 'deposit_attachments', key: 'deposit_id', value: txn.source_id };
    case 'credit_card':
      return { table: 'credit_card_attachments', key: 'credit_card_id', value: txn.source_id };
    case 'manual':
      return { table: 'journal_entry_attachments', key: 'journal_entry_id', value: txn.journal_entry_id };
    default: return null;
  }
};
```

Files are opened using the `UniversalFilePreviewProvider` context methods (`openBillAttachment(file_path, file_name)`, etc.).

