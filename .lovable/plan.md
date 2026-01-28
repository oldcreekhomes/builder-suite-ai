

## Goal
Make the manual PO creation flow **identical** to the bid closeout flow by adding the "Custom Message" field and passing the same payload to `send-po-email`.

## Changes

### 1. Add Custom Message field to CreatePurchaseOrderDialog

**File:** `src/components/CreatePurchaseOrderDialog.tsx`

Add a new state variable:
```typescript
const [customMessage, setCustomMessage] = useState("");
```

Add a new textarea field (after the Notes field, around line 376):
```typescript
{/* Custom Message for Email */}
<div className="space-y-2">
  <Label htmlFor="custom-message">Custom Message (Optional)</Label>
  <Textarea
    id="custom-message"
    placeholder="Add a custom message to include in the email..."
    className="w-full resize-none focus-visible:ring-offset-0 focus-visible:ring-2 focus-visible:ring-black focus-visible:border-black"
    rows={3}
    value={customMessage}
    onChange={(e) => setCustomMessage(e.target.value)}
  />
</div>
```

### 2. Update the email payload to match bid closeout flow

**File:** `src/components/CreatePurchaseOrderDialog.tsx` (lines 247-256)

Change from:
```typescript
const { data: emailData, error: emailError } = await supabase.functions.invoke('send-po-email', {
  body: {
    purchaseOrderId: purchaseOrder.id,
    companyId: selectedCompany.id,
    projectAddress: projectData.data?.address || 'N/A',
    companyName: selectedCompany.name,
    totalAmount: amount ? parseFloat(amount) : 0,
    senderCompanyName: senderData?.company_name || 'Builder Suite AI'
  }
});
```

To:
```typescript
const { data: emailData, error: emailError } = await supabase.functions.invoke('send-po-email', {
  body: {
    purchaseOrderId: purchaseOrder.id,
    companyId: selectedCompany.id,
    projectAddress: projectData.data?.address || 'N/A',
    companyName: selectedCompany.name,
    customMessage: customMessage.trim() || undefined,
    totalAmount: amount ? parseFloat(amount) : 0,
    costCode: { code: selectedCostCode.code, name: selectedCostCode.name },
    senderCompanyName: senderData?.company_name || 'Builder Suite AI'
  }
});
```

### 3. Reset custom message on form reset

Add `setCustomMessage("");` to the form reset block (around line 279) and in the `useEffect` that handles edit mode.

## Result

After this change, both flows will:
- Show the same "Custom Message (Optional)" field
- Send the exact same payload structure to `send-po-email`:
  - `purchaseOrderId`
  - `companyId`
  - `projectAddress`
  - `companyName`
  - `customMessage`
  - `totalAmount`
  - `costCode`
  - `senderCompanyName`

## Summary of files to edit

| File | Change |
|------|--------|
| `src/components/CreatePurchaseOrderDialog.tsx` | Add `customMessage` state, add textarea UI, update email payload, reset on close |

