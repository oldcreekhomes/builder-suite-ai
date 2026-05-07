## Problem

In `src/components/companies/EditCompanyDialog.tsx`, the `DialogContent` is capped at `max-h-[90vh]` with `overflow-hidden`, but the inner `<form>` has no scroll container. When a company has many associated cost codes, the form grows past 90vh and the Cancel / Update Company buttons get clipped below the viewport.

## Fix

Restructure the dialog into a flex column with a scrollable body and a pinned footer:

1. `DialogContent` → `max-w-3xl max-h-[90vh] flex flex-col overflow-hidden p-0` (keep the outside-interaction guards).
2. Wrap `DialogHeader` in a non-shrinking container with the original padding (`px-6 pt-6`).
3. Wrap the `<Form>` / `<form>` area in a `flex-1 overflow-y-auto px-6` container so the long content (cost codes, representatives, etc.) scrolls inside the dialog.
4. Move the existing Cancel + Update Company button row out of the scroll area into a sticky footer `<div className="border-t px-6 py-4 flex justify-end gap-2 shrink-0">` at the bottom of `DialogContent`. Keep the Upload Certificate button where it is in the Insurance tab — only the bottom action row moves.
5. Verify Tabs/inner sections still render correctly at narrow heights and that the footer is always visible regardless of cost-code count.

## Out of scope

No changes to data, validation, cost-code search, or any other dialog behavior.
