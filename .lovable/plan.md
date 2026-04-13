

## Fix Receipt URL and Add Payment Method Update

### Issue 1: Receipt still shows lovable.dev URL at bottom

The current approach uses `iframe.contentWindow.print()` which triggers the browser's native print dialog. Browsers automatically add headers/footers (including the page URL) that cannot be reliably suppressed via CSS. The fix is to stop using print-to-PDF entirely and instead generate a proper downloadable HTML file as a blob, which the user can open or save directly -- no browser print headers/footers involved.

**Change in `ManageSubscriptionDialog.tsx`** (lines 102-208):
- Replace the `print()`-based approach with a Blob download approach:
  - Create the HTML string as before
  - Convert it to a `Blob` with type `text/html`
  - Use `URL.createObjectURL()` + a temporary `<a>` element with `download` attribute to trigger a file download
  - The downloaded file will be named like `Invoice_in_xxxxx.html`
- This completely eliminates any browser-injected URLs since it's a direct file download, not a print operation

### Issue 2: No way to update credit card

Add an "Update" button next to the payment method that opens a Stripe Billing Portal session (limited to payment method update). This reuses the existing `customer-portal` edge function.

**Change in `ManageSubscriptionDialog.tsx`** (around line 367-385):
- Add a small "Update" button next to the payment method card
- On click, invoke the `customer-portal` edge function and open the returned URL in a new tab
- When the user returns, the dialog data will refresh on next open

### Files to modify
1. `src/components/settings/ManageSubscriptionDialog.tsx`
   - Replace print-to-PDF with blob download for receipts
   - Add "Update" button to payment method section that opens Stripe billing portal

