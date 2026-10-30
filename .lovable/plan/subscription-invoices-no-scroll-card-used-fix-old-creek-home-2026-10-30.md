# Subscription invoices: no scroll, card used, fix Old Creek Homes downloads

## 1. Remove scrolling on Invoice History
- Drop the fixed short height on the Invoice History list so all invoices show in full.
- Only scroll if the list is taller than the screen (cap at the visible page height).

## 2. Show the card used on each invoice
- For each invoice, read the card that actually paid it from Stripe (brand + last 4), not just today's default card — so older invoices paid on a different card show that card.
- Add a "Paid With: Discover ending in 6025" row under Invoice Details on the downloaded and emailed PDF.
- Also show "•••• 6025" on each row in the Invoice History list.

## 3. Fix all Old Creek Homes invoices
- Invoices are built fresh each time you download or send, so every Old Creek Homes invoice (Oct, Sep, Aug, Jul, and earlier) picks up the change automatically — no data editing needed.
- Add a "Bill To" block with the company name (Old Creek Homes, LLC) and billing email, and brand the header "BuilderSuite ML" to match the app.
- Verify by downloading several Old Creek Homes invoices, including the Jul $273.49 one.

## Technical details
- `get-subscription-details`: expand `charge.payment_method_details` (or payment_intent → payment_method) on `invoices.list` and return `cardBrand`/`cardLast4` per invoice, plus company name.
- `SubscriptionTab.tsx` line ~592: replace `max-h-40 overflow-y-auto` with `max-h-[calc(100vh-…)] overflow-y-auto` so it only scrolls past screen height.
- `SubscriptionInvoicePdfDocument.tsx`: add Paid With row and Bill To block; pass company name.
- `send-subscription-invoice-email`: include the same card line in the email.

Question: if "right information" means something else (e.g. a mailing address or a different name on the invoice), tell me and I'll add it.
