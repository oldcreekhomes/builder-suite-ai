

## Replace Disabled 3-Dot Menu with Lock Icon for Locked Rows

### Problem
In the report detail dialogs (`AccountDetailDialog` and `JobCostActualDialog`), locked/reconciled rows show a grayed-out 3-dot menu icon. The rest of the application uses a **Lock icon** from lucide-react for this purpose. These should match.

### Changes

**Pattern to apply** (matching `ProjectBudget.tsx` and `JobCostsContent.tsx`):
Replace `<TableRowActions actions={[]} disabled />` with a Lock icon wrapped in a Tooltip:
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <div className="flex justify-center">
      <Lock className="h-4 w-4 text-muted-foreground" />
    </div>
  </TooltipTrigger>
  <TooltipContent>...</TooltipContent>
</Tooltip>
```

**Files:**

| File | Change |
|---|---|
| `src/components/accounting/AccountDetailDialog.tsx` | Import `Lock` from lucide-react. Replace `<TableRowActions actions={[]} disabled />` (line 1181) with `<Lock>` icon, keep existing tooltip logic |
| `src/components/reports/JobCostActualDialog.tsx` | Import `Lock` from lucide-react. Replace `<TableRowActions actions={[]} disabled />` (line 415) with `<Lock>` icon, keep existing tooltip logic |

Both files already have the Tooltip wrapping and descriptive content -- only the inner element changes from the disabled dots to a Lock icon.

