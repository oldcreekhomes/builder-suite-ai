

## Fix: Distribute PO-Level Billing to Line Items by Cost Code

### Problem

Bills from Four Seasons Construction were linked to the PO at the header level (`purchase_order_id` set, `purchase_order_line_id` NULL). The current code correctly fetches these but dumps them all into "Unallocated" ($11,206). Instead, it should match them to the correct PO line items using cost_code_id, so that the "Decks" line shows $1,032 billed (from INV0021's deck line), framing labor lines show their billed amounts, etc.

### Root Cause

In `src/hooks/useVendorPurchaseOrders.ts`, lines 125-149 fetch bill_lines where `purchase_order_id` is set but `purchase_order_line_id` is NULL. All of these are lumped into `billedByPoIdOnly` and `unallocatedInvoicesByPoId` maps, which feed directly into the "Unallocated" row. There is no attempt to match them to PO lines by cost code.

### Solution

**File: `src/hooks/useVendorPurchaseOrders.ts`**

After fetching PO-level bill_lines (line 130), instead of putting them all into unallocated, try to match each one to a PO line item by cost_code_id:

1. For each PO-level bill_line, look for a PO line in the same PO that shares the same `cost_code_id`
2. If a match is found, add the billed amount and invoice to that line's totals (same maps used by line-level billing: `billedByLineId` and `invoicesByLineId`)
3. Only if no cost_code match is found, put it into "Unallocated"

```text
Logic change (lines 135-149):

For each PO-level bill_line:
  1. Find PO lines for this PO that match the bill_line's cost_code_id
  2. If exactly one match: attribute to that PO line
  3. If multiple matches: attribute to the first one (or split -- but single match is most common)
  4. If no match: keep as unallocated (current behavior)
```

This ensures:
- The $7,000 + $3,206 + $1,000 framing labor bills (cost code 4370) get attributed to the 4370 PO lines
- Any deck-related billing (cost code 4810) gets attributed to the Decks PO line
- Only truly unmatched billing remains in "Unallocated"

### Technical Details

The key change is in the loop at lines 135-149. Instead of blindly adding to `billedByPoIdOnly`, check if the bill_line's `cost_code_id` matches any PO line's `cost_code_id` within the same PO:

```typescript
(poBilled || []).forEach((bl: any) => {
  if (!bl.purchase_order_id) return;
  
  // Try to match to a PO line by cost_code_id
  const poLineList = linesByPo.get(bl.purchase_order_id) || [];
  const matchingLine = poLineList.find(l => l.cost_code_id && l.cost_code_id === bl.cost_code_id);
  
  const invoice: BilledInvoice = {
    bill_id: bl.bill_id,
    reference_number: bl.bills?.reference_number || 'No Ref',
    bill_date: bl.bills?.bill_date || '',
    amount: bl.amount || 0,
  };
  
  if (matchingLine) {
    // Attribute to the matched PO line
    billedByLineId.set(matchingLine.id, (billedByLineId.get(matchingLine.id) || 0) + (bl.amount || 0));
    const invoices = invoicesByLineId.get(matchingLine.id) || [];
    invoices.push(invoice);
    invoicesByLineId.set(matchingLine.id, invoices);
  } else {
    // No match -- keep as unallocated
    billedByPoIdOnly.set(bl.purchase_order_id, (billedByPoIdOnly.get(bl.purchase_order_id) || 0) + (bl.amount || 0));
    const invoices = unallocatedInvoicesByPoId.get(bl.purchase_order_id) || [];
    invoices.push(invoice);
    unallocatedInvoicesByPoId.set(bl.purchase_order_id, invoices);
  }
});
```

**Important**: The `linesByPo` map must be built BEFORE this loop (it currently is built after, at line 152). The line grouping code needs to move up, before the PO-level billing distribution.

### Ordering Change

Move lines 151-157 (the `linesByPo` grouping) to before line 132 (before the PO-level billing loop), so that PO lines are available for cost_code matching.

### Expected Result

- Framing Labor lines show their billed totals from INV0010/INV0012
- Decks line shows $1,032 billed (highlighted green for current bill)
- Unallocated drops to $0 (or only contains truly unmatched items)
- Tooltips on billed amounts show the correct invoice breakdowns

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useVendorPurchaseOrders.ts` | Move linesByPo grouping up; distribute PO-level billing to lines by cost_code match |

