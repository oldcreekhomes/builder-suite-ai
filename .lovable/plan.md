# Fix: Credit Card back arrow shows nothing

## What's wrong
Your Stitch Fix entry is saved and tagged to 228 S Washington. But when the page loads credit card entries, the request for their line items fails, so the page thinks there are zero entries and greys out the back arrow. That request asks the database to look up cost codes, accounts and lots in a way it doesn't support.

## Fix
- Load credit card line items on their own (no lookups attached). Then fetch the matching cost codes, accounts and lots in separate batched requests and join them in the app.
- If the line items can't load, still show the entries so the arrows keep working.
- Check the list against the live data: on 228 S Washington the back arrow should load the Stitch Fix $174.89 entry.

## Technical details
- `src/hooks/useCreditCards.ts` list query: replace the `cost_codes:cost_code_id(...)`, `accounts:account_id(...)`, `project_lots:lot_id(...)` embeds (PGRST200, no FK) with a plain `select('*')` on `credit_card_lines`, then `batchedIn` lookups on `cost_codes`, `accounts`, `project_lots` by id, attaching them as the same property names so the form code stays unchanged.
- Also check that `CreditCardSearchDialog` and the edit-load path don't use the same broken embed.
