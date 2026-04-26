## Problem

In the Create Purchase Order dialog (bid flow), edits to cost codes, descriptions, quantities, and unit costs disappear whenever the user switches browser tabs/windows and comes back. This is why the rows in your screenshot revert (e.g., 2050 - Civil Engineering reappears where you had changed them to 2055 - Surveying).

## Root cause

`src/components/CreatePurchaseOrderDialog.tsx` has two effects that re-seed `lineItems` from `bidContext`:

- **Line 105 effect** depends on `[editOrder, open, bidContext]`. The parent (`BiddingTableRow` / `BiddingCompanyRow`) builds `bidContext` as a **new inline object literal** on every render (lines 263 / 214). When the window regains focus, React Query refetches bidding data (default `refetchOnWindowFocus: true`), the parent re-renders, a brand-new `bidContext` reference is passed in, and this effect fires — overwriting all your edits with the original extracted lines.
- **Line 147 effect** depends on `[open, bidContext?.initialLineItems]` and does the same re-seed if the array reference changes.

So every focus/refetch silently resets the table to the AI's initial guess.

## Fix

Make the seeding effects run **only on dialog open / true input changes**, not on every parent re-render.

### 1. `src/components/CreatePurchaseOrderDialog.tsx`

- Add a ref (`hasInitializedRef`) that flips to `true` the first time the dialog opens with a given `editOrder?.id` / `bidContext?.bidPackageId + biddingCompany.id`, and resets when the dialog closes.
- The "pre-populate" effect (line 105) should only seed `selectedCompany`, `notes`, `uploadedFiles`, `customMessage`, and `lineItems` when `hasInitializedRef.current === false`. After that, user edits are preserved across re-renders.
- The "re-seed on AI extraction" effect (line 147) should only run when `isExtracting` transitions from `true` → `false` (i.e., the AI just finished). Track previous `isExtracting` with a ref so subsequent parent re-renders don't re-seed.
- The "load existing lines when editing" effect (line 154) should also be guarded by `hasInitializedRef` so a refetch of `existingLines` doesn't clobber edits.
- On dialog close (`open === false`), reset `hasInitializedRef.current = false` so the next open re-seeds correctly.

### 2. No parent changes required

We do not need to memoize `bidContext` in `BiddingTableRow` / `BiddingCompanyRow` — the ref-guarded effects make the dialog robust to any parent re-render frequency.

## What this does NOT change

- Initial seeding from the AI extraction still works.
- The title-case capitalization of the initial guess still works.
- Editing the description (cursor fix from the previous change) is preserved.
- Closing and reopening the dialog still loads fresh data.
- Nothing about email sending, recipients, or the "no recipients enabled" guard changes.

## Files to modify

- `src/components/CreatePurchaseOrderDialog.tsx` (only file)
