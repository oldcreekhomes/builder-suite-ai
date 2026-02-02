
# Vendor Payments Report (1099-Style) for Builder Suite Projects

## Overview

Create a new report that shows all vendor payments broken out by project and then by vendor, similar to QuickBooks' 1099 report format. This report will only display projects that use Builder Suite for accounting (`accounting_software = 'builder_suite'`).

---

## Report Format

Based on the QuickBooks example provided, the report will display:

```
+------------------------------------------------------------+
|              Vendor Payments Report (1099-Style)            |
|                    Old Creek Homes, LLC                     |
|                     As of 02/02/2026                        |
+------------------------------------------------------------+

PROJECT: 115 E. Oceanwatch Ct. Nags Head, NC 27959
+----------------------------------------------------------+
|                     ELG Consulting, LLC                   |
+----------------------------------------------------------+
| Type      | Date       | Num      | Memo        | Amount |
|-----------|------------|----------|-------------|--------|
| Bill      | 09/23/2024 |          | Design...   |$1,250  |
| Bill      | 09/29/2024 |          | Permits     |  $600  |
| Bill Pmt  | 01/09/2026 |          | Payment     |$4,958  |
|----------------------------------------------------------|
| Total - ELG Consulting, LLC               |     $21,772  |
+----------------------------------------------------------+

+----------------------------------------------------------+
|                     Carter Lumber                         |
+----------------------------------------------------------+
| Type      | Date       | Num      | Memo        | Amount |
|-----------|------------|----------|-------------|--------|
| Bill      | 10/15/2025 | 12345    | Lumber      |$5,000  |
| Bill Pmt  | 11/18/2025 |          | Payment     |$17,673 |
|----------------------------------------------------------|
| Total - Carter Lumber                     |     $74,554  |
+----------------------------------------------------------+

PROJECT TOTAL: 115 E. Oceanwatch Ct.         |   $XXX,XXX  |

(Repeat for each Builder Suite project...)

============================================================
GRAND TOTAL (All Builder Suite Projects)    |  $X,XXX,XXX |
============================================================
```

---

## Implementation Steps

### Step 1: Create New Report Tab Component

**File:** `src/components/reports/VendorPaymentsContent.tsx`

This component will:
1. Fetch all projects with `accounting_software = 'builder_suite'`
2. For each project, fetch:
   - Bills (posted/paid, non-reversal)
   - Bill Payments
   - Checks (direct payments)
3. Group data by project → vendor
4. Display in a collapsible, expandable table format
5. Calculate running totals per vendor and per project
6. Support date range filtering (optional "As of Date")
7. Support PDF export

**Key Features:**
- Collapsible project sections
- Collapsible vendor sections within each project
- Summary totals at vendor, project, and grand total levels
- Transaction types: Bill, Bill Pmt, Check

### Step 2: Create Data Hook

**File:** `src/hooks/useVendorPaymentsReport.ts`

Query logic:
```typescript
// 1. Fetch Builder Suite projects
const builderSuiteProjects = projects.filter(
  p => p.accounting_software === 'builder_suite' 
    && p.status !== 'Template'
    && p.status !== 'Permanently Closed'
);

// 2. For each project, fetch transactions
// - Bills: from 'bills' table where status in ('posted', 'paid')
// - Bill Payments: from 'bill_payments' table
// - Checks: from 'checks' table

// 3. Combine and sort by vendor, then by date
```

### Step 3: Add Tab to ReportsTabs

**File:** `src/components/reports/ReportsTabs.tsx`

Add a new "Vendor Payments" tab alongside existing tabs:
- Balance Sheet
- Income Statement  
- Job Costs
- Accounts Payable
- **Vendor Payments** (new)

### Step 4: Create PDF Export Component

**File:** `src/components/reports/pdf/VendorPaymentsPdfDocument.tsx`

Similar to existing PDF documents, this will generate a downloadable PDF with:
- Company header
- Project sections
- Vendor subsections
- Transaction line items
- Totals at each level

---

## Technical Details

### Data Sources

| Transaction Type | Source Table | Key Fields |
|-----------------|--------------|------------|
| Bill | `bills` | bill_date, reference_number, notes, total_amount, vendor_id |
| Bill Pmt | `bill_payments` | payment_date, check_number, memo, total_amount, vendor_id |
| Check | `checks` | check_date, check_number, memo, amount, pay_to |

### Filter Criteria

- **Bills:** `status IN ('posted', 'paid')`, `is_reversal = false`, `reversed_by_id IS NULL`
- **Bill Payments:** All (they represent actual payments)
- **Checks:** `is_reversal = false OR is_reversal IS NULL`
- **Projects:** `accounting_software = 'builder_suite'`, excluding templates and permanently closed

### UI Components Used

- `Collapsible` from Radix for expandable sections
- `Table` components for transaction display
- `Card` for project groupings
- Date picker for "As of Date" filter
- PDF export button using `@react-pdf/renderer`

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useVendorPaymentsReport.ts` | **CREATE** | Data fetching hook for vendor payments |
| `src/components/reports/VendorPaymentsContent.tsx` | **CREATE** | Main report UI component |
| `src/components/reports/pdf/VendorPaymentsPdfDocument.tsx` | **CREATE** | PDF export template |
| `src/components/reports/ReportsTabs.tsx` | **MODIFY** | Add new tab for Vendor Payments |

---

## Sample Data Structure

```typescript
interface VendorPaymentsData {
  projects: {
    id: string;
    address: string;
    vendors: {
      id: string;
      name: string;
      transactions: {
        type: 'Bill' | 'Bill Pmt' | 'Check';
        date: string;
        num: string | null;
        memo: string | null;
        amount: number;
      }[];
      total: number;
    }[];
    projectTotal: number;
  }[];
  grandTotal: number;
}
```

---

## Builder Suite Projects (9 total)

Based on current data, these projects will appear in the report:
1. 103 E Oxford Ave, Alexandria, VA 22301
2. 115 E. Oceanwatch Ct. Nags Head, NC 27959
3. 126 Longview Drive, Alexandria, VA, 22314
4. 1416 N Longfellow Street, Arlington, VA 22205
5. 214 N Granada, Arlington, VA
6. 412 E Nelson, Alexandria, Virginia 22301
7. 413 E Nelson Ave, Alexandria, Virginia 22301
8. 6119 11th Street N, Arlington, VA 22205
9. 923 17th St. South Arlington, VA 22202

---

## Estimated Effort

| Task | Time |
|------|------|
| Data hook creation | 30 mins |
| Report UI component | 45 mins |
| PDF export component | 30 mins |
| Tab integration | 10 mins |
| Testing & refinement | 20 mins |
| **Total** | ~2.5 hours |
