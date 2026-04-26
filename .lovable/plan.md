## Add hover tooltip on truncated Cost Code / Description inputs

### Problem
In `CreatePurchaseOrderDialog`, the Cost Code and Description inputs in the Line Items table are narrow. Long values (e.g. "2050 - Civil Engineering", "1. Boundary & Topographic Survey") get visually cut off with no way to see the full text.

### Fix — `src/components/CreatePurchaseOrderDialog.tsx` (lines ~542–558)

Wrap each of the two inputs in a shadcn `Tooltip` so that on hover, if the value overflows the input width, the full text is shown.

- **Cost Code cell**: Wrap `<CostCodeSearchInput>` in `<Tooltip><TooltipTrigger asChild>...</TooltipTrigger><TooltipContent>{line.cost_code_display}</TooltipContent></Tooltip>`. Only render the tooltip when `line.cost_code_display` is non-empty AND would overflow (detected via a ref + `scrollWidth > clientWidth` check on the underlying input). Simplest reliable approach: always conditionally render the TooltipContent when `cost_code_display` is non-empty — the tooltip only appears on hover anyway, and showing the full value is harmless. Use `delayDuration={300}`.
- **Description cell**: Same pattern wrapping the `<Input>`. Tooltip content = `line.description`, rendered only when `line.description` is non-empty.

Both tooltips use `side="top"` and the standard shadcn `TooltipContent` styling (already imported from `@/components/ui/tooltip`).

### Implementation details
- Add imports: `Tooltip, TooltipTrigger, TooltipContent, TooltipProvider` from `@/components/ui/tooltip` (if not already imported).
- Wrap the `<TableBody>` (or the whole table) once in a single `<TooltipProvider delayDuration={300}>` so we don't create one per row.
- `TooltipTrigger asChild` directly wraps the input/component — no extra DOM wrapper that would break the table layout.
- Skip the overflow-detection logic — always show the tooltip when the field has a value. This matches "show the full value on hover" without ref/measurement complexity, and tooltips don't appear unless the user hovers, so there's zero visual cost when not needed.

### Not changing
- Input widths, table layout, titleCase logic, line-item state, save logic, attachments, custom message, sending-to columns. Only adding hover tooltips on two inputs.

### Files touched
- `src/components/CreatePurchaseOrderDialog.tsx` only.
