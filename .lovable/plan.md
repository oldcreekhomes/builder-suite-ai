
# Remove Vendor Payments Report Tab

## Summary

Delete the temporary Vendor Payments report from the Reports section of the UI.

---

## Files to Delete

| File | Description |
|------|-------------|
| `src/components/reports/VendorPaymentsContent.tsx` | Main content component for the report |
| `src/components/reports/pdf/VendorPaymentsPdfDocument.tsx` | PDF export component |
| `src/hooks/useVendorPaymentsReport.ts` | Data fetching hook |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/reports/ReportsTabs.tsx` | Remove the Vendor Payments tab and import |

---

## Changes to ReportsTabs.tsx

**Remove import (line 6):**
```typescript
import { VendorPaymentsContent } from "./VendorPaymentsContent";
```

**Remove tab trigger (change grid-cols-5 to grid-cols-4):**
```typescript
// Before
<TabsList className="grid w-full max-w-4xl grid-cols-5">
  ...
  <TabsTrigger value="vendor-payments">Vendor Payments</TabsTrigger>

// After
<TabsList className="grid w-full max-w-4xl grid-cols-4">
  // No vendor-payments trigger
```

**Remove tab content (lines 38-41):**
```typescript
<TabsContent value="vendor-payments" className="mt-6">
  <VendorPaymentsContent projectId={projectId} />
</TabsContent>
```

---

## Result

The Reports tab will have 4 tabs remaining:
1. Balance Sheet
2. Income Statement
3. Job Costs
4. Accounts Payable
