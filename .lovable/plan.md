## Two fixes in `src/components/bills/BillPOSummaryDialog.tsx`

### 1. Replace native HTML `title` tooltips with shadcn `Tooltip`
The Cost Code and Description cells currently use `title="..."`, which renders the OS's native tooltip (the gray box in the screenshot) — not the styled shadcn tooltip used everywhere else in the app.

- Import `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` from `@/components/ui/tooltip`.
- Wrap the truncated Cost Code cell content and the Description cell content in a `<Tooltip>` whose `TooltipContent` shows the full string.
- Wrap the table (or the dialog body) in a single `<TooltipProvider>` so all tooltips use the app-standard styling.
- Remove every `title={...}` attribute on those `<TableCell>`s so the browser's native tooltip never shows.

### 2. Fix Cost Code sort (4200 should never appear after 4275)
Current sort key reads only `line.cost_code_display`. When that field is null/empty on a line, the rendered value falls back to `match.cost_code_display`, so the sort key disagrees with what's displayed and rows interleave.

Fix: build the sort key as `line.cost_code_display || matchByPoId.get(resolveLineToPoId(line))?.cost_code_display || ''`, then extract the leading numeric (`/\d+(\.\d+)?/`) from that combined value. Move the `sortedBillLines` block to be defined after `matchByPoId` and `resolveLineToPoId` are in scope (they already are). Keep the stable, ascending, missing-codes-last behavior.

## Out of scope
- No other dialogs, no math/totals changes, no schema changes.
