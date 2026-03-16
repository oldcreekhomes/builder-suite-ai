

## Plan: Fix Alternate (and Line Item) Amount Input

### Problem
The amount inputs use `value={formatCurrency(item.amount)}` which formats on every keystroke. When typing "26354", each character triggers: type "2" → formats to "$2.00" → strip non-numeric → parse → 2.00. Next keystroke appends to "$2.006" → parses as 2.006, etc. The input is unusable for typing amounts.

### Fix: `src/components/templates/SubcontractorContractForm.tsx`

**Use raw string state while editing, format only on blur.** For both line items and alternates:

1. Track which amount field is being edited (e.g., `editingAmount` state with type/index).
2. Store a raw string value while editing.
3. On focus: set raw value (unformatted number).
4. On change: update raw string only.
5. On blur: parse the raw string, update the actual amount, clear editing state — the display reverts to `formatCurrency()`.

```tsx
// New state
const [editingAmount, setEditingAmount] = useState<{ type: 'line' | 'alt'; index: number; raw: string } | null>(null);

// Input for alternates (same pattern for line items)
<Input
  value={
    editingAmount?.type === 'alt' && editingAmount.index === index
      ? editingAmount.raw
      : formatCurrency(item.amount)
  }
  onFocus={() => setEditingAmount({ type: 'alt', index, raw: item.amount ? String(item.amount) : '' })}
  onChange={(e) => setEditingAmount(prev => prev ? { ...prev, raw: e.target.value } : null)}
  onBlur={() => {
    if (editingAmount) {
      const parsed = parseFloat(editingAmount.raw.replace(/[^0-9.-]/g, ''));
      updateAlternateAmount(index, isNaN(parsed) ? '0' : String(parsed));
      setEditingAmount(null);
    }
  }}
/>
```

### Files to Edit
- `src/components/templates/SubcontractorContractForm.tsx` — fix both line item and alternate amount inputs

