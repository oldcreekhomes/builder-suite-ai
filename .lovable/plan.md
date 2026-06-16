## Diagnosis
Both views read from the same `projects.qb_invoices_approved_date` column, so the data is shared. The desync is a React Query cache problem in `useUpdateProjectQBInvoiceDates`:

- Mutation only invalidates `["projects"]`.
- PM Accounting Alerts card uses `useAccountingManagerBills` keyed `['accounting-manager-bills']` — never invalidated, so the card you just edited keeps showing stale values until a full reload.
- Accountant `useProjects` (`['projects', user.id]`) is prefix-matched by `["projects"]`, but only active queries refetch immediately; switching tabs can serve cached data first.

Net effect: edits made in the PM card don't visibly propagate to the Accountant dashboard (and vice-versa) without a hard refresh.

## Fix (one file)

Edit `src/hooks/useUpdateProjectQBInvoiceDates.ts` `onSuccess`:

1. Invalidate every cache key that reads these dates and force an immediate refetch on all of them:
   - `["projects"]` (covers `useProjects` → Accountant table)
   - `["accounting-manager-bills"]` (PM Accounting Alerts card)
   - `["accountant-project-alerts"]` (per-project alerts, if present)
2. Pass `refetchType: 'all'` so background/inactive queries also refetch, guaranteeing the other dashboard view shows fresh data the moment the user switches to it.

Apply the same fix to the sibling mutations so all accountant-editable fields sync both ways:
- `src/hooks/useUpdateProjectQBReconciliationDate.ts`
- `src/hooks/useUpdateProjectQBClosedBooksDate.ts`

(Each adds the extra `invalidateQueries` calls with `refetchType: 'all'`. No schema, UI, or business-logic changes.)

## Out of scope
- The "10300 Glen Way" row appearing on PM but not on Accountant is a separate filter (`accounting_software` toggle on Accountant view), not a sync bug.
- No changes to layouts or columns.
