Tighten Price History stat columns and reduce graph stretch

Problem
After widening the Price History dialog, the stat columns have too much horizontal space and the chart/graph feels overly stretched.

Solution
Update `src/components/settings/PriceHistoryModal.tsx`:

- Reduce the dialog width from `max-w-4xl` to a tighter size (e.g. `max-w-3xl` or `max-w-[850px]`) so the graph is less wide while still accommodating all stat labels.
- Reduce the statistics grid gap from `gap-4` to `gap-2` so the columns sit closer together.
- Keep the single-row `grid-cols-6` layout and `whitespace-nowrap` labels.
- Preserve existing values, colors, helper text, and chart behavior.
