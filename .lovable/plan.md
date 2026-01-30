

## PO-to-Bill Matching Feature for Manage Bills

### Overview
Create a system that links purchase orders (POs) to vendor invoices (bills) so accountants can verify that bills match approved POs before payment. This provides confidence that vendors are billing correctly based on contracted amounts.

### Current State
- **Bills** have: `project_id`, `vendor_id`, and `bill_lines` with `cost_code_id`
- **POs** have: `project_id`, `company_id` (vendor), `cost_code_id`, `total_amount`, `po_number`
- **No explicit link** exists between bills and POs
- Bills and POs can be matched using the combination of: project + vendor + cost code

### Matching Logic
A bill line can be matched to a PO when:
1. Same `project_id`
2. Bill's `vendor_id` = PO's `company_id`
3. Bill line's `cost_code_id` = PO's `cost_code_id`

### Solution Overview
Add a **PO Status indicator** column to the Approved bills table showing:

| Status | Meaning | Visual |
|--------|---------|--------|
| **Matched** | PO exists + bill amount ≤ PO amount | Green checkmark ✓ |
| **Over PO** | PO exists but cumulative bills exceed PO amount | Yellow warning ⚠️ |
| **No PO** | No matching PO found | Gray dash - |

Clicking the indicator opens a **PO Comparison Dialog** showing:
- PO number and contracted amount
- Total billed to date against this PO (all bills)
- Remaining PO balance
- List of all bills linked to this PO

---

### Technical Changes

#### 1. Create Custom Hook: `useBillPOMatching.ts`

```typescript
// New hook to fetch PO matching data for bills
interface POMatch {
  po_id: string;
  po_number: string;
  po_amount: number;
  total_billed: number;
  remaining: number;
  status: 'matched' | 'over_po' | 'no_po';
}

export function useBillPOMatching(projectId: string, vendorId: string, costCodeIds: string[])
```

This hook will:
- Query `project_purchase_orders` matching project + vendor + cost codes
- Query all bills with matching criteria to calculate cumulative billed amount
- Return matching status and PO details

#### 2. Add PO Status Column to `BillsApprovalTable.tsx`

In the **Approved** tab table:
- Add a new column header "PO Status" (width: w-20)
- For each bill, show an icon badge:
  - ✓ Green: Bill matches PO and within budget
  - ⚠️ Yellow: Bill matches PO but cumulative amount exceeds PO
  - — Gray: No matching PO found
- Make the badge clickable to open comparison dialog

#### 3. Create `POComparisonDialog.tsx` Component

A dialog showing:
- **Header**: PO Number (e.g., "2025-103E-0002")
- **Summary Cards**:
  - PO Amount: $1,500.00
  - Billed to Date: $1,200.00
  - Remaining: $300.00
- **Bills Table**: List of all bills tied to this PO with dates and amounts
- **Warning Banner**: If over PO amount, show prominent warning

#### 4. Update PayBillsTable.tsx (Same Pattern)

Add the same PO Status column to the payment table so accountants see PO status when paying bills.

---

### Database Queries

**Query to get PO matches for a bill:**
```sql
SELECT 
  po.id as po_id,
  po.po_number,
  po.total_amount as po_amount,
  COALESCE(SUM(bl2.amount), 0) as total_billed,
  (po.total_amount - COALESCE(SUM(bl2.amount), 0)) as remaining
FROM project_purchase_orders po
LEFT JOIN bills b2 ON b2.project_id = po.project_id 
  AND b2.vendor_id = po.company_id
  AND b2.status IN ('posted', 'paid')
LEFT JOIN bill_lines bl2 ON bl2.bill_id = b2.id 
  AND bl2.cost_code_id = po.cost_code_id
WHERE po.project_id = :projectId
  AND po.company_id = :vendorId
  AND po.cost_code_id = :costCodeId
GROUP BY po.id, po.po_number, po.total_amount
```

---

### Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useBillPOMatching.ts` | Hook to fetch PO matching data |
| `src/components/bills/POComparisonDialog.tsx` | Dialog showing PO vs bill comparison |
| `src/components/bills/POStatusBadge.tsx` | Reusable badge component |

### Files to Modify

| File | Change |
|------|--------|
| `src/components/bills/BillsApprovalTable.tsx` | Add PO Status column to Approved bills |
| `src/components/bills/PayBillsTable.tsx` | Add PO Status column to payment view |

---

### User Flow

1. **Accountant opens Manage Bills → Approved tab**
2. **Sees new "PO Status" column** showing match status for each bill
3. **Clicks on a PO Status badge** to open comparison dialog
4. **Reviews PO details**:
   - Sees contracted PO amount
   - Sees how much has been billed to date
   - Sees remaining budget
   - Can review all related bills
5. **Makes informed decision** to pay or investigate discrepancies

---

### Visual Mockup

**Approved Bills Table (with new column):**
```text
| Vendor      | Cost Code       | Amount    | PO Status | Pay Bill |
|-------------|-----------------|-----------|-----------|----------|
| PEG LLC     | 2100: MEP Eng   | $1,500.00 | ✓ Matched | [Pay]    |
| Wire Gill   | 2240: Legal     | $1,912.50 | — No PO   | [Pay]    |
| City Concr  | 4275: Concrete  | $27,500   | ⚠️ Over   | [Pay]    |
```

**PO Comparison Dialog:**
```text
┌─────────────────────────────────────────────────┐
│ Purchase Order: 2025-103E-0002                  │
├─────────────────────────────────────────────────┤
│ PO Amount:      $1,500.00                       │
│ Billed to Date: $1,200.00                       │
│ Remaining:      $300.00                         │
├─────────────────────────────────────────────────┤
│ Related Bills:                                   │
│ ┌───────────────────────────────────────────┐   │
│ │ Date       | Reference | Amount           │   │
│ │ 01/06/26   | OCH-02304 | $750.00          │   │
│ │ 01/15/26   | OCH-02305 | $450.00          │   │
│ └───────────────────────────────────────────┘   │
│                                                  │
│ Current Bill: OCH-02306 for $400.00             │
│ ⚠️ Warning: This payment will exceed PO by $100 │
└─────────────────────────────────────────────────┘
```

---

### Benefits

1. **Confidence**: Accountants can verify bills match approved contracts
2. **Budget Control**: Catch overbilling before payment
3. **Visibility**: See all bills tied to a single PO
4. **Audit Trail**: Clear link between POs and invoices
5. **No Workflow Change**: Information is additive, not blocking

