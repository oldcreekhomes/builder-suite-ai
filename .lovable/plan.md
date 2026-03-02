

## Fix Transactions Page Content Alignment

### Problem
The Transactions content area (Journal Entry, Write Checks, etc.) uses `p-6` padding, which adds too much top padding. This pushes the content down so its top border doesn't align with the sidebar's project dropdown -- inconsistent with all other pages that use the standard `px-6 pt-3 pb-6`.

### Change

**File: `src/components/transactions/TransactionsTabs.tsx`**
- Line 45: Change `p-6` to `px-6 pt-3 pb-6` on the inner content wrapper div.

This is the same one-line fix applied to Reports and Manage Bills previously.

