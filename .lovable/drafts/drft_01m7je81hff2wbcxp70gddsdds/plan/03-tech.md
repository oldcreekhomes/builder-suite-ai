## Technical details
- `JobCostActualDialog.tsx` and `accounting/AccountDetailDialog.tsx`: `max-w-6xl` -> `max-w-7xl`; `TableHeader` gets `sticky top-0 z-10 bg-background`.
- Replace local `formatCurrency` with a negative-aware version: `value < 0` -> `(${abs})` with `text-destructive` class on the cell span.
- SQL UPDATE on `bill_lines.memo` and matching `journal_entry_lines.memo` for ELG Consulting lines on cost code 4020 at this project, normalizing to "<Month> <Year>" (year from bill date when missing). Verify by re-query.
