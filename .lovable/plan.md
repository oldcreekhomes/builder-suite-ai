
## What’s happening (why the “test email” works but the vendor email doesn’t)

Right now, the PO number shown in the email is coming from **one specific field**: `requestData.poNumber`.

- Your **test email** flow (and the “Send PO Email” modal on the PO page) **does include** `poNumber` in the payload:
  - `src/components/purchaseOrders/SendPOTestEmailModal.tsx` → sends `poNumber: purchaseOrder.po_number`
  - `src/components/purchaseOrders/SendPOEmailModal.tsx` → sends `poNumber: purchaseOrder.po_number`

- But the two workflows that you’re focused on:
  1) **Bid closeout** (bidding → sends PO)
  2) **Manual creation of a PO** (CreatePurchaseOrderDialog)
  
  …**do NOT include** `poNumber` in the payload today:
  - `src/hooks/usePOMutations.ts` → does not send `poNumber`
  - `src/components/CreatePurchaseOrderDialog.tsx` → does not send `poNumber`

Inside the edge function, the email template uses:
- `const poNumberDisplay = data.poNumber || 'Purchase Order';`

So when `poNumber` is missing, the email literally falls back to showing **“Purchase Order”** (which is exactly what you’re seeing as “PO number: Purchase Order”).

Also important: the edge function *already fetches the PO from the database* (and that record contains `po_number`), but it **never uses** `poData.po_number` when building the template. It only uses `requestData.poNumber`.

That’s why the “test email” can look right while the real vendor emails do not: they are not “EXACT SAME” yet for `poNumber`.

---

## Goal

Make **every PO email** identical at every level (including `customMessage` and `poNumber`) regardless of whether it’s sent from:
- bidding closeout,
- manual PO creation,
- resend,
- or test.

And ensure the email always displays the real PO number from the database.

---

## Implementation plan

### Step 1 — Fix the edge function so it ALWAYS uses the PO number from the database
**File:** `supabase/functions/send-po-email/index.ts`

**Change:**
- When `purchaseOrderId` is provided, we already fetch:
  ```ts
  const { data: poData } = await supabase.from('project_purchase_orders').select('*').eq('id', purchaseOrderId).single();
  ```
- We will extract `poData.po_number` and use it as the primary source for the template:
  - Add a `let poNumber: string | null = null;`
  - After fetching `poData`, set `poNumber = poData.po_number ?? null`
  - When generating HTML, pass:
    ```ts
    poNumber: poNumber || requestData.poNumber
    ```

**Why this matters:**
- Even if the frontend forgets to send `poNumber`, the email still shows the correct PO number.
- This is the most reliable source of truth.

---

### Step 2 — Make BOTH “bidding closeout” and “manual create” pass `poNumber` explicitly (so payloads are identical)
Even though Step 1 guarantees correctness, we still want the payloads to be identical and explicit.

#### 2A) Manual creation flow
**File:** `src/components/CreatePurchaseOrderDialog.tsx`

You already query:
```ts
.select('*, po_number')
```

**Change:**
- Add `poNumber: purchaseOrder.po_number` to the `send-po-email` body payload so it matches test/send flows.

#### 2B) Bidding closeout flow
**File:** `src/hooks/usePOMutations.ts`

After inserting the PO, we currently call `send-po-email` without `poNumber`.

**Change:**
- Include `poNumber: purchaseOrder.po_number` in the `send-po-email` payload.

---

### Step 3 — Fix resend flow to include `poNumber` too
Right now resend looks up the PO like this:
```ts
.select('id, total_amount, files, bid_package_id')
```
So it doesn’t even have `po_number` available to send.

**File:** `src/hooks/usePOMutations.ts`

**Change:**
- Update the resend PO lookup select to include `po_number`.
- Then include `poNumber: existingPO.po_number` in the resend invoke payload.

---

### Step 4 — Verify with logging (temporary) and an end-to-end test sequence
After implementing:
1) Send PO via **bidding closeout** → confirm email shows the real `po_number`
2) Create PO via **manual Create Purchase Order dialog** → confirm email shows the real `po_number`
3) Use **Resend PO** → confirm email shows the real `po_number`
4) Use **Send Test Email** → confirm still correct

If needed, we’ll add one or two extra edge-function logs like:
- “✅ Using PO number from DB: {poNumber}”
so we can confirm the runtime behavior in Supabase logs.

---

## Files that will be changed

1) `supabase/functions/send-po-email/index.ts`
   - Use `poData.po_number` (DB source of truth) as the primary value for the template

2) `src/components/CreatePurchaseOrderDialog.tsx`
   - Send `poNumber: purchaseOrder.po_number` in the email payload

3) `src/hooks/usePOMutations.ts`
   - Send `poNumber: purchaseOrder.po_number` for bidding closeout
   - Update resend lookup to fetch `po_number` and pass it

---

## Expected result

- The “PO Number” line in the email will always show the real value like `2026-7659W-0003`.
- The test email and vendor emails will be identical (same payload keys, same template behavior).
- Even if a future UI change accidentally stops passing `poNumber`, the edge function will still render it correctly from the database.
