

## Add PO Status Column to All Manage Bills Tabs

### Problem
The PO Status column currently only appears on the **Approved** tab. Per your request, it should appear on all four tabs:
- Review
- Rejected
- Approved
- Paid

### Root Cause
In `BillsApprovalTable.tsx`, the PO Status column visibility is tied to `showPayBillButton`:

```typescript
const showPOStatusColumn = showPayBillButton;
```

Since only the Approved tab passes `showPayBillButton={true}`, the column is hidden on other tabs.

### Solution
Change the logic to **always show the PO Status column** regardless of the tab status.

---

### Technical Changes

#### File: `src/components/bills/BillsApprovalTable.tsx`

**Change 1: Always show PO Status column (line 586)**

| Current | New |
|---------|-----|
| `const showPOStatusColumn = showPayBillButton;` | `const showPOStatusColumn = true;` |

This single change will:
- Show PO Status on the **Review** tab (draft bills)
- Show PO Status on the **Rejected** tab (void bills)
- Continue showing on **Approved** tab (posted bills)
- Show PO Status on **Paid** tab (paid bills)

---

### Files to Modify

| File | Change |
|------|--------|
| `src/components/bills/BillsApprovalTable.tsx` | Set `showPOStatusColumn = true` (line 586) |

---

### Result After Implementation
All tabs in Manage Bills will have a consistent "PO Status" column showing:
- Matched (green checkmark) - Bill matches PO and within budget
- Over (yellow warning) - Cumulative bills exceed PO amount
- No PO (gray dash) - No matching purchase order found

Clicking any status badge will open the PO Comparison Dialog with details.

