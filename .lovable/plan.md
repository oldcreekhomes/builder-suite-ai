## Plan: Consolidate Subscription page to fit a 14" laptop without scrolling

Rework `src/components/settings/SubscriptionTab.tsx` only — no logic, edge function, or data changes.

### Layout changes

- Page wrapper: tighten to `space-y-3` (from `space-y-6`); shrink header (smaller icon + single inline subtitle).
- Use a **2-column grid** on `lg+` so the page fills width instead of stacking everything full-width:
  - **Left column:** Current Plan (with plan line, price, next billing, plus inline Projects/Seats pills) + Auto-renew row.
  - **Right column:** Payment Method, Billing Information, Invoice History — stacked.
- Convert each section from `<Card>` with big `CardHeader`/`CardContent` padding to compact bordered panels (`rounded-lg border p-3`) with a small uppercase section label (`text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2`), matching the dense style we already use elsewhere.
- Inline rows everywhere (one line each):
  - Plan: `BuilderSuite Pro – Monthly (×7) · $273.00/mo · Next: Jul 27, 2026` on one line; `Projects 33 · Seats 7` as small inline chips beside it.
  - Payment Method: single row (icon · brand •••• 2470 · Expires 06/2029 · Default · Update).
  - Billing Information: single row (icon · email · Edit), no separate description line — move the helper text to a `title`/tooltip on the label.
  - Invoice History: compact single-line rows (already close), capped height with internal scroll if >3 invoices (`max-h-32 overflow-y-auto`).
  - Auto-renew: compact single row.
- Remove the standalone status badge block; show the status badge inline next to the "Subscription" title.
- Drop `Separator`s and reduce vertical padding throughout (`py-2`, `gap-2`).

### Free-tier path
Keep the existing upgrade + pricing cards but also tightened (`p-3`, smaller text). Not the primary case but should still look consistent.

### Out of scope
No changes to edge functions, queries, Stripe logic, or the cancel/reactivate AlertDialog content.
