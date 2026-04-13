

## Fix Subscription Dialog: Border, Billing Date, and Invoice Download

### Issues Found

1. **Right border clipped**: `overflow-hidden` on `DialogContent` clips the right border/shadow. Need to remove it -- the content fits without scrolling anyway since we sized it properly.

2. **Next billing date showing "—"**: The edge function correctly converts `sub.current_period_end` (line 69), but I need to test what Stripe is actually returning. I'll call the edge function directly to see the raw response and fix accordingly. Most likely the timestamp conversion is fine but the value needs debugging.

3. **Invoice link goes to blocked external site**: The `invoice_pdf` URL links to Stripe's hosted invoice PDF. Instead of the external link icon, replace with a download button that opens the PDF for download.

### Changes

**1. `src/components/settings/ManageSubscriptionDialog.tsx`**
- Remove `overflow-hidden` from DialogContent to fix right border clipping
- Replace the `ExternalLink` icon on invoices with a `Download` icon and add `download` attribute to the anchor tag so it downloads instead of navigating away
- Keep the billing date guard but also add a console.log to help debug if the value is still null

**2. Test the edge function** using `curl_edge_functions` to see the actual `current_period_end` value being returned -- if it's null, fix the edge function's Stripe timestamp handling.

### Technical Details

```tsx
// Border fix - remove overflow-hidden:
<DialogContent className="max-w-lg">

// Invoice download button - replace ExternalLink with Download:
import { Download } from "lucide-react";
// ...
{inv.invoice_pdf && (
  <a href={inv.invoice_pdf} target="_blank" rel="noopener noreferrer" download>
    <Download className="h-3.5 w-3.5" />
  </a>
)}
```

### Files to modify
1. `src/components/settings/ManageSubscriptionDialog.tsx`
2. Possibly `supabase/functions/get-subscription-details/index.ts` (if edge function test reveals date issue)

