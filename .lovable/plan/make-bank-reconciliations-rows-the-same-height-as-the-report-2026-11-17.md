# Make Bank Reconciliations rows the same height as the report windows

The Bank Reconciliations window uses taller rows (extra space around each cell) than the report detail windows.

- Make every row in the Bank Reconciliations window 32px tall, one line, matching the Balance Sheet detail window.
- Use the same smaller column headers and text size as the report windows.
- No changes to what's shown or how anything works.

## Technical details
- `src/components/accounting/BankReconciliationsDialog.tsx`: change cell padding from `p-3` to `px-3 py-0`, give each `<tr>` `h-8`, header cells `h-8 text-xs`, body text `text-sm`, and add `whitespace-nowrap` so nothing wraps.
