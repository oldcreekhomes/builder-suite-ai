## Plan

Fix the account detail register so Bill Pmt - Check rows use the original bill's Description, not payment/backfill memos.

## What will change

- Update `src/components/accounting/AccountDetailDialog.tsx` only.
- For consolidated bill payment rows, stop displaying `bill_payments.memo` as the Description.
- When loading the payment's included bills, also load each bill's first non-empty `bill_lines.memo`.
- Set the register row Description from that original bill description:
  - Single bill payment: show that bill's Description, e.g. `Ceramic tile installation`.
  - Multi-bill/consolidated payment: join the unique bill descriptions with `; `.
  - If no original bill description exists, fall back to `-` instead of `Backfilled from JE...`.

## Why this is happening

The transaction detail dialog is now correct because it fetches `bill_lines.memo` directly from the original bill. The register row for consolidated bill payments is still using `bill_payments.memo`, which contains old system text like `Backfilled from JE...`. That memo should not be shown as the user-facing Description.

## Technical notes

- No database changes.
- No changes to bill editing.
- Keep the existing account/cost code display logic intact.
- The Description will stay live because it will be read from the same `bill_lines.memo` field used by the original bill.