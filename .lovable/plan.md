
# Update: Per-Vendor Invoice Number Uniqueness

## Summary

Change the duplicate invoice validation from **company-wide** to **per-vendor** uniqueness. The same invoice number will be allowed from different vendors, but not from the same vendor.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useReferenceNumberValidation.ts` | Add `vendorId` parameter to `checkDuplicate` function |
| `src/components/bills/ManualBillEntry.tsx` | Pass `vendorId` to `checkDuplicate` |
| `src/components/bills/ApproveBillDialog.tsx` | Pass `vendorId` to `checkDuplicate` |
| `src/components/bills/EditBillDialog.tsx` | Pass `vendorId` to `checkDuplicate` |
| `src/components/bills/EditExtractedBillDialog.tsx` | Pass `vendorId` to `checkDuplicate` |
| `src/components/bills/BillsApprovalTabs.tsx` | Pass `vendorId` to `checkDuplicate` in batch validation |
| `supabase/functions/recreate-bill/index.ts` | Add `.eq('vendor_id', vendorId)` to duplicate check query |

---

## Technical Changes

### 1. Core Hook: `useReferenceNumberValidation.ts`

**Before:**
```typescript
const checkDuplicate = async (
  referenceNumber: string,
  excludeBillId?: string
): Promise<DuplicateCheckResult>
```

**After:**
```typescript
const checkDuplicate = async (
  referenceNumber: string,
  vendorId: string,  // NEW - required
  excludeBillId?: string
): Promise<DuplicateCheckResult>
```

**Query Change:**
```typescript
// Add vendor filter to query
let query = supabase
  .from("bills")
  .select(...)
  .eq("vendor_id", vendorId)  // NEW - filter by vendor
  .neq("status", "void")
  .not("reference_number", "is", null);
```

---

### 2. ManualBillEntry.tsx

**Location:** Line ~290

```typescript
// Before
const { isDuplicate, existingBill } = await checkDuplicate(referenceNumber);

// After
const { isDuplicate, existingBill } = await checkDuplicate(referenceNumber, vendorId);
```

---

### 3. ApproveBillDialog.tsx

**Location:** Line ~158

```typescript
// Before
const { isDuplicate, existingBill } = await checkDuplicate(referenceNumber);

// After
const { isDuplicate, existingBill } = await checkDuplicate(referenceNumber, vendorId);
```

---

### 4. EditBillDialog.tsx

**Location:** Line ~336

```typescript
// Before
const { isDuplicate, existingBill } = await checkDuplicate(referenceNumber, billId);

// After
const { isDuplicate, existingBill } = await checkDuplicate(referenceNumber, vendorId, billId);
```

---

### 5. EditExtractedBillDialog.tsx

**Location:** Line ~484

```typescript
// Before
const { isDuplicate, existingBill } = await checkDuplicate(refNo);

// After
const { isDuplicate, existingBill } = await checkDuplicate(refNo, vendorId);
```

---

### 6. BillsApprovalTabs.tsx (Batch Approval)

**Location:** Lines ~225-240

```typescript
// Before
const { isDuplicate, existingBill } = await checkDuplicate(referenceNumber);

// After
const vendorId = bill.extracted_data?.vendor_id || bill.extracted_data?.vendorId;
if (!vendorId) {
  // Skip duplicate check if no vendor - will fail later in approval anyway
  validatedBills.push(bill);
  continue;
}
const { isDuplicate, existingBill } = await checkDuplicate(referenceNumber, vendorId);
```

---

### 7. Edge Function: `recreate-bill/index.ts`

**Location:** Lines ~39-66

```typescript
// Before
const { data: existingBill, error: checkError } = await supabaseClient
  .from('bills')
  .select(...)
  .eq('owner_id', ownerId)
  .neq('status', 'void')
  .ilike('reference_number', referenceNumber.trim())
  ...

// After
const { data: existingBill, error: checkError } = await supabaseClient
  .from('bills')
  .select(...)
  .eq('owner_id', ownerId)
  .eq('vendor_id', vendorId)  // NEW - filter by vendor
  .neq('status', 'void')
  .ilike('reference_number', referenceNumber.trim())
  ...
```

---

## Updated Error Messages

Messages will be updated to clarify per-vendor uniqueness:

**Before:**
> Invoice #12345 already exists for vendor "ABC Company" on project "123 Main St"

**After:**
> Invoice #12345 already exists for this vendor on project "123 Main St" (dated 2024-01-15)

---

## Behavior After Change

| Scenario | Result |
|----------|--------|
| Same invoice # from same vendor | **BLOCKED** - Duplicate error |
| Same invoice # from different vendors | **ALLOWED** - Each vendor has their own numbering |
| Same invoice # from same vendor on different projects | **BLOCKED** - Still a duplicate from that vendor |
