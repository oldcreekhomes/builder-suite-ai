Plan: Dark-theme the Bill Notes dialog

1. Update `src/components/bills/BillNotesDialog.tsx` so the dialog uses the project's dark theme semantic tokens (`bg-background`, `text-foreground`, `border-border`, `bg-card`, etc.) instead of the current light default.
2. Ensure the header, textarea, previous-note cards, and footer all have proper contrast on a dark background.
3. Keep existing scroll behavior and footer button placement intact.
4. Verify with `bun run build:dev` (or `typecheck` if available) and check the preview for visual consistency.
