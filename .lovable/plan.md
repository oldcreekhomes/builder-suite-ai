# Compact Engagement Type UI + Hide Insurance for Suppliers

Two small UX improvements to the Add/Edit Company dialogs.

## 1. Hide Insurance tab when Supplier / Retail is selected

Suppliers (Home Depot, CVS, gas stations) don't need insurance certificates.

- `AddCompanyDialog.tsx`: only render the Insurance `TabsTrigger` and `TabsContent` when `!isSupplier`. Adjust `TabsList` grid: `grid-cols-1` (supplier) vs `grid-cols-3` (trade partner).
- `EditCompanyDialog.tsx`: same change. Also, if user switches an existing trade partner to supplier and they're currently on the Insurance tab, fall back to `company-info`.

## 2. Compact the "How will you work with this company?" selector

Replace the two large description cards with a tight inline row. Each option becomes a small pill/button with a `?` icon next to the label that reveals the description in a tooltip on hover.

Layout (single row, auto width):

```text
How will you work with this company? *   [ (•) Trade Partner (?) ]   [ ( ) Supplier / Retail (?) ]
```

- Use `Tooltip` from `@/components/ui/tooltip` (already in project).
- Use `HelpCircle` icon from `lucide-react`.
- Tooltip text (kept verbatim from current cards):
  - Trade Partner: "Subcontractors & vendors we bid, send POs, and notify (e.g. plumber, electrician). Requires a contact."
  - Supplier / Retail: "Places we just buy from or pay bills (e.g. Home Depot, CVS, gas station). No contact needed."
- Keep the same form field binding (`engagement_type`) and the selected/ring styling, just much smaller (single line, `px-3 py-1.5`, no description text inline).
- Wrap the selector area in `TooltipProvider` if not already in scope.

Apply the identical compact layout to `EditCompanyDialog.tsx`.

## Files Modified
- `src/components/companies/AddCompanyDialog.tsx`
- `src/components/companies/EditCompanyDialog.tsx`

## Out of Scope
- No DB / schema changes.
- No changes to validation logic, representatives logic, or cost code logic — only the visual selector and the Insurance tab visibility.
