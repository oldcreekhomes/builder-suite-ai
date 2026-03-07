

## Fix: Table PO Status Does Not Account for Current Bill Amount

### Problem
The PO status badge in the Manage Bills table computes `remaining = poAmount - totalBilled` but **excludes the current bill** from `totalBilled` (line 163-166 in `useBillPOMatching.ts`). This means a PO for $12,860.01 with a bill of $12,860.02 shows "Matched" in the table (remaining = $12,860.01), but the PODetailsDialog correctly shows "Over Budget" by $0.01 because it factors in "This Bill."

The table and dialog must agree.

### Solution
When computing each PO match's `remaining` and `status`, also subtract the current bill's line amounts that are allocated to that PO. This mirrors what the dialog does with its "This Bill" column.

### Changes — `src/hooks/useBillPOMatching.ts`

**Lines 228-233** — After finding the matched PO, calculate the current bill's contribution to that PO and factor it into remaining/status:

```typescript
if (!matches.find(m => m.po_id === matchedPo.id)) {
  const ccData = costCodeLookup.get(matchedPo.cost_code_id || '');
  const totalBilled = billedLookup.get(matchedPo.id) || 0;
  const poAmount = matchedPo.total_amount || 0;

  // Include current bill's lines allocated to this PO
  const thisBillAmount = allLines
    .filter(l => {
      let lpId = l.purchase_order_id;
      if (lpId === '__none__' || lpId === '__auto__') lpId = undefined;
      if (lpId === matchedPo.id) return true;
      // Fallback-matched lines: same cost code
      if (!lpId && l.cost_code_id === matchedPo.cost_code_id) return true;
      return false;
    })
    .reduce((s, l) => s + (l.amount || 0), 0);

  const remaining = poAmount - totalBilled - thisBillAmount;
  const status: 'matched' | 'over_po' = remaining >= 0 ? 'matched' : 'over_po';

  matches.push({ ... });
}
```

This ensures the $12,860.02 bill against a $12,860.01 PO shows "Over" in both the table badge and the dialog. One file, one section.

