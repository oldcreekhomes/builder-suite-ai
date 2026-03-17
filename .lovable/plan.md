

## Fix: Performance Lag and Import Errors

Two changes to `src/components/budget/BudgetExcelImportDialog.tsx`:

### 1. Merge duplicate cost code mappings during parsing (lines ~210-221)
After building the `items` array, add a merge step that combines rows mapping to the same cost code by summing their amounts. This prevents duplicate insert errors and reduces row count.

```typescript
// After items are built, merge rows that map to the same cost code
const mergedMap = new Map<string, ParsedItem>();
const unmatchedItems: ParsedItem[] = [];
items.forEach(item => {
  if (!item.matchedCostCodeId) {
    unmatchedItems.push(item);
    return;
  }
  const existing = mergedMap.get(item.matchedCostCodeId);
  if (existing) {
    existing.amount += item.amount;
    existing.description += `, ${item.description}`;
    existing.excelCode += `, ${item.excelCode}`;
  } else {
    mergedMap.set(item.matchedCostCodeId, { ...item });
  }
});
const mergedItems = [...mergedMap.values(), ...unmatchedItems];
setParsedItems(mergedItems);
```

### 2. Replace heavy Select dropdowns with click-to-edit pattern (lines ~467-483)
Instead of rendering ~300 `SelectItem` components per row (94 rows × 300 = 28,000+ DOM nodes), show a read-only label by default. Only render the `Select` when the user clicks the label to remap.

- Add state: `const [editingIndex, setEditingIndex] = useState<number | null>(null)`
- For each row, if `editingIndex !== realIdx`, show a clickable `<span>` with the matched label (or "Click to map...")
- When clicked, set `editingIndex = realIdx` to show the `Select` for that single row
- On `onValueChange`, call `handleMapChange` and reset `editingIndex` to `null`

This reduces DOM from ~28,000 select options to ~300 (one dropdown at a time).

### Files to edit
- `src/components/budget/BudgetExcelImportDialog.tsx`

