# Make Description readable in report detail windows

The detail window that opens when you click an amount is too narrow, so Description gets cut off with "...".

## What changes
- The detail windows open much wider (up to almost the full screen width).
- Description gets most of the extra room and wraps onto a second line when it's long, so the whole text shows.
- Hovering a description still shows the full text.

## Where it applies
- Balance Sheet, Income Statement, and Accounts Payable details (they share one window).
- Job Costs details.

## Technical details
- `src/components/accounting/AccountDetailDialog.tsx`: DialogContent `max-w-5xl` -> `max-w-[95vw] xl:max-w-7xl`; Description column header gets flexible width; description cell drops `max-w-[160px]`/truncate in favor of `whitespace-normal break-words`.
- `src/components/reports/JobCostActualDialog.tsx`: same width change; description cell drops `max-w-0 truncate` and wraps.
- Other columns, amounts, and the PDF are unchanged.
