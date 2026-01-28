
## Add "UPDATED - Purchase Order" Email Notification

### Summary
When a user edits and saves a purchase order, we will send an "UPDATED - Purchase Order" email to the same representatives who received the original PO email. This follows the same pattern as the cancellation email we just implemented.

### Current Behavior
- **Creating a new PO**: Email is sent automatically ✅
- **Updating an existing PO**: No email is sent (just updates database and shows toast)
- **Canceling a PO**: Cancellation email is sent ✅

### New Behavior
- **Updating an existing PO**: "UPDATED - Purchase Order" email will be sent

---

### Technical Implementation

#### 1. Modify the Edge Function to Support Update Mode

**File:** `supabase/functions/send-po-email/index.ts`

Add a new `isUpdate` boolean parameter and update the email template logic:

**Changes to interface (line 26-41):**
```typescript
interface POEmailRequest {
  // ... existing fields ...
  isCancellation?: boolean;
  isUpdate?: boolean;  // NEW
}
```

**Changes to template logic (around line 100-104):**
```typescript
// Email title changes based on status
let emailTitle = 'Purchase Order';
let awardMessage = 'You have been awarded this purchase order:';

if (isCancellation) {
  emailTitle = 'CANCELED - Purchase Order';
  awardMessage = 'This purchase order has been canceled:';
} else if (isUpdate) {
  emailTitle = 'UPDATED - Purchase Order';
  awardMessage = 'This purchase order has been updated:';
}
```

**Changes to email subject (in the send logic):**
```typescript
const emailSubject = isCancellation 
  ? `CANCELED - Purchase Order - ${finalProjectAddress}`
  : isUpdate 
    ? `UPDATED - Purchase Order - ${finalProjectAddress}`
    : `Purchase Order - ${finalProjectAddress}`;
```

---

#### 2. Update the Edit Flow to Send Update Email

**File:** `src/components/CreatePurchaseOrderDialog.tsx`

After successfully updating a purchase order (around line 188-209), add the email send logic:

```typescript
if (editOrder) {
  // Update existing purchase order
  const { data, error } = await supabase
    .from('project_purchase_orders')
    .update({...})
    .eq('id', editOrder.id)
    .select('*, po_number')  // Include po_number in response
    .single();

  if (error) throw error;

  // Send the update notification email
  const [projectData, senderData] = await Promise.all([
    supabase.from('projects').select('address').eq('id', projectId).single(),
    supabase.auth.getUser().then(async (userResult) => {
      if (userResult.data.user) {
        const { data } = await supabase.from('users')
          .select('company_name').eq('id', userResult.data.user.id).single();
        return data;
      }
      return null;
    })
  ]);

  const { data: emailData, error: emailError } = await supabase.functions.invoke('send-po-email', {
    body: {
      purchaseOrderId: data.id,
      companyId: selectedCompany.id,
      poNumber: data.po_number,
      projectAddress: projectData.data?.address || 'N/A',
      companyName: selectedCompany.name,
      customMessage: customMessage.trim() || undefined,
      totalAmount: amount ? parseFloat(amount) : 0,
      costCode: { code: selectedCostCode.code, name: selectedCostCode.name },
      senderCompanyName: senderData?.company_name || 'Builder Suite AI',
      isUpdate: true  // NEW FLAG
    }
  });

  // Handle email result with toast
}
```

---

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/send-po-email/index.ts` | Add `isUpdate` parameter, update email title/subject logic |
| `src/components/CreatePurchaseOrderDialog.tsx` | Send update email after saving edits |

---

### Email Changes

The update email will look identical to the regular PO email except:
- **Header**: "UPDATED - Purchase Order" (instead of "Purchase Order")
- **Body message**: "This purchase order has been updated:" (instead of "You have been awarded this purchase order:")
- **Email subject**: "UPDATED - Purchase Order - [address]"

---

### Flow Diagram

```text
User edits PO and clicks "Update Purchase Order"
       ↓
Database is updated with new values
       ↓
send-po-email invoked with isUpdate: true
       ↓
Email sent to all representatives with receive_po_notifications = true
       ↓
Success toast: "Purchase order updated and notification sent to X recipients"
```

---

### Notes
- Uses the same `receive_po_notifications` flag - same people who get PO emails get update emails
- The update email contains all the current PO information (not a diff of what changed)
- If the email fails to send, the PO update still succeeds but user sees a warning toast
