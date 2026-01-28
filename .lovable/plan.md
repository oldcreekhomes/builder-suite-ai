

## Cancel Purchase Order with Email Notification

### Summary
When a user deletes a purchase order, we will:
1. Show a confirmation dialog explaining that a cancellation email will be sent
2. Send a "CANCELED - Purchase Order" email (same template, just with "CANCELED" prefix)
3. Then delete the PO from the database

### Technical Implementation

#### 1. Modify the Edge Function to Support Cancellation Mode

**File:** `supabase/functions/send-po-email/index.ts`

Add a new `isCancellation` boolean parameter to the request interface and modify the email template to conditionally show "CANCELED - Purchase Order" in the header instead of "Purchase Order".

Changes:
- Add `isCancellation?: boolean` to the `POEmailRequest` interface
- Update the email template to use conditional title:
  ```typescript
  const emailTitle = data.isCancellation ? 'CANCELED - Purchase Order' : 'Purchase Order';
  ```
- Update the body text from "You have been awarded this purchase order:" to "This purchase order has been canceled:" when `isCancellation` is true
- Update email subject line accordingly

#### 2. Create a New Mutation for Cancel + Delete

**File:** `src/hooks/usePurchaseOrderMutations.ts`

Add a new mutation `cancelAndDeletePurchaseOrder` that:
1. Fetches the full PO data (including company, cost code, project address, files)
2. Calls `send-po-email` with `isCancellation: true`
3. Deletes the PO from the database

```typescript
const cancelAndDeletePurchaseOrder = useMutation({
  mutationFn: async (purchaseOrder: PurchaseOrder) => {
    // Step 1: Fetch all necessary data for the email
    const [projectData, costCodeData, senderData] = await Promise.all([...]);
    
    // Step 2: Send cancellation email
    await supabase.functions.invoke('send-po-email', {
      body: {
        purchaseOrderId: purchaseOrder.id,
        companyId: purchaseOrder.company_id,
        poNumber: purchaseOrder.po_number,
        isCancellation: true, // NEW FLAG
        // ... same fields as regular PO email
      }
    });
    
    // Step 3: Delete the PO
    const { error } = await supabase
      .from('project_purchase_orders')
      .delete()
      .eq('id', purchaseOrder.id);
    
    if (error) throw error;
  }
});
```

#### 3. Update the Delete Confirmation Dialog Message

**File:** `src/components/purchaseOrders/components/PurchaseOrdersTableRowActions.tsx`

Update the `DeleteButton` description to inform users about the cancellation email:

```typescript
<DeleteButton
  onDelete={() => onDelete(item)}  // Pass full item instead of just ID
  title="Cancel Purchase Order"
  description={`Are you sure you want to cancel PO "${item.po_number}"? A cancellation email will be sent to all company representatives who receive PO notifications.`}
  // ...
/>
```

#### 4. Update Component Chain to Pass Full PO Object

Currently, `onDelete` only receives `itemId`. We need to pass the full PO object so we have all the data needed for the cancellation email without refetching.

**Files to update:**
- `PurchaseOrdersTableRowActions.tsx` - Change `onDelete(item.id)` to `onDelete(item)`
- `PurchaseOrdersTableRowContent.tsx` - Update `onDelete` prop type
- `PurchaseOrdersTableRow.tsx` - Update `onDelete` prop type
- `PurchaseOrdersTable.tsx` - Update handler

### Flow Diagram

```text
User clicks Delete
       ↓
Confirmation Dialog appears:
"Are you sure you want to cancel PO 2026-7659W-0003?
A cancellation email will be sent to all company
representatives who receive PO notifications."
       ↓
User clicks "Delete" (or "Cancel PO")
       ↓
cancelAndDeletePurchaseOrder mutation runs:
  1. Send cancellation email (isCancellation: true)
  2. Delete PO from database
       ↓
Success toast: "Purchase order canceled and notification sent"
```

### Email Changes

The cancellation email will look identical to the regular PO email except:
- **Header**: "CANCELED - Purchase Order" (instead of "Purchase Order")
- **Body message**: "This purchase order has been canceled:" (instead of "You have been awarded this purchase order:")
- **Email subject**: "CANCELED - Purchase Order for [address]"

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/send-po-email/index.ts` | Add `isCancellation` parameter, update template |
| `src/hooks/usePurchaseOrderMutations.ts` | Add `cancelAndDeletePurchaseOrder` mutation |
| `src/components/purchaseOrders/components/PurchaseOrdersTableRowActions.tsx` | Update dialog message, pass full item |
| `src/components/purchaseOrders/components/PurchaseOrdersTableRowContent.tsx` | Update prop types |
| `src/components/purchaseOrders/PurchaseOrdersTableRow.tsx` | Update prop types |
| `src/components/purchaseOrders/PurchaseOrdersTable.tsx` | Update handler to use new mutation |

### Notes
- Uses the same `receive_po_notifications` flag - if they receive PO emails, they receive cancellation emails
- The cancellation email is sent BEFORE deletion, so we still have access to all the PO data
- If the email fails to send, the PO will NOT be deleted (user will see an error)

