# Lock Cash Position balances — remove hover account picker

## What changes
- Remove the hover link icon and "Choose live account" dropdown from the Bank Balance cell in the shared Cash Position table (both dashboards, one code change).
- Bank Balance becomes display-only: the live Capital One balance shows with the green dot, and the hover tooltip still shows Live vs. Books for information only — no editing.
- The one Refresh button in the header stays and still updates all connected accounts at once.

## What stays
- The Capital One connection itself and all existing per-job account assignments (stored server-side) are untouched — balances keep flowing in.
- Connect Bank button stays in the header in case the bank ever needs to be re-linked.
- PM dashboard read-only view unchanged.

## Technical details
- Edit `CashPositionCard.tsx` only: delete the account-picker popover, its state, and the `assign` call; keep the balance display, green live indicator, and Live-vs-Books tooltip.
- The edge function's `assign` action stays available (harmless) but is no longer called from the UI.

## Verification
- Build check; confirm no picker icon appears on hover in either dashboard and Refresh still works.
