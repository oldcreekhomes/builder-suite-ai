

## Root Cause

You're not crazy — the matcher CAN handle multi-PO invoices in principle (each bill line can match its own PO), but in this specific case it never got the chance because **extraction collapsed the entire invoice into one $27,180 line**.

Confirmed in DB for the An Exterior, Inc. invoice C26019 on 923 17th St:
- `pending_bill_uploads.extracted_data.line_items` = **1 line**: `"AN EXTERIOR INC. - Invoice"` for $27,180
- `pending_bill_lines` = **1 row**: same single $27,180 line, no cost code, no PO

So the table correctly shows "no PO" — there's nothing to match because the 3 real line items ($20,350 Siding / $2,800 Exterior Trim / $4,030 Cornice) were never extracted as separate lines. Once a line exists per scope, the existing PO matcher already handles multiple POs per bill (we tested that pattern).

### Two real problems

1. **AI extraction is dropping the line breakdown** even though the prompt tells it to split multi-item invoices. On this invoice the description column lists 3 items with 3 amounts in the right column — clean structure — and it still came back as one line. The validation step on line ~1117 also has a fallback that *force-collapses* to one line if the line sum ≠ total, which can hide split failures.

2. **PO numbers printed on the invoice are completely ignored.** This invoice literally prints `PO2025-923T-0036` and `PO#2025-923T-0027` next to the amounts. The extraction prompt never asks the model to capture PO references, and the matcher never looks at them. That's the easiest, most reliable signal on the page and we're throwing it away.

## Answer to your question

> "Are you only able to do this as exact match, or can you recognize 3 line items match 3 POs?"

The matcher *can* handle 3 lines → 3 POs. It's the extraction step that's failing to give it 3 lines to work with. Fix extraction → existing matcher will assign all 3 POs correctly (each amount is an exact match to its PO).

## Plan

### 1. Teach the extractor to capture PO references per line
Update the prompt in `supabase/functions/extract-bill-data/index.ts`:
- Add a `po_reference` field to each `line_items` entry
- Instruct the model to extract any PO number printed in the description, memo, "Customer PO" column, or anywhere on the line (patterns: `PO#1234`, `PO 1234`, `P.O. 1234`, `Customer PO: 1234`, bare `2025-923T-0036` style)
- Add explicit examples in the prompt showing this exact invoice pattern

### 2. Strengthen multi-line splitting
In the same prompt:
- Add explicit instruction: when the invoice has a Description/Amount table with multiple rows that each have their own dollar amount, every row is a separate `line_item` — no exceptions
- Reinforce with a worked example modeled on this An Exterior invoice (3 rows, 3 cost codes, 3 POs)

### 3. Stop the "collapse to single line" fallback from hiding split failures
In `extract-bill-data/index.ts` around line 1117:
- Today: if `lineSum ≠ total_amount`, it overwrites everything with one combined line
- Change: only collapse when the discrepancy is unfixable (e.g., zero lines or sum is way off). When sum is close (within a few dollars/tax/rounding), keep the lines and adjust, don't nuke them
- Log a clear warning so we can see when extraction is actually failing vs. just rounding noise

### 4. Use captured PO references during line→PO matching
In `src/utils/poLineMatching.ts` (and the bill-line resolver in `src/hooks/useBillPOMatching.ts`):
- If a bill line has a `po_reference` string, look up the matching PO by `po_number` for that vendor+project FIRST, before the keyword/amount/cost-code scoring
- Direct PO-number match = automatic 100% confidence, skips everything else
- Falls back to existing smart matching when no PO reference is present

### 5. Add po_reference field to pending_bill_lines + bill_lines
Migration:
- Add nullable `po_reference text` column to `pending_bill_lines` and `bill_lines`
- Populate it from the extractor; preserve through approval into the final bill
- Used by step 4 for matching and shown in the line editor so users can see/edit what was captured

### 6. Re-extract this specific bill to verify
After deploying, re-run extraction on pending upload `a48126b8-69e1-4a46-ab28-2badb725debc` (or have the user click "Re-extract"). Expected result:
- 3 line items: Siding $20,350, Exterior Trim/Cornice $2,800, Cornice $4,030
- Each tagged with its PO reference
- Each auto-linked to the matching PO (`2025-923T-0035`, `2025-923T-0036`, `2025-923T-0027`)
- Bill status badge flips from "no PO" to "Matched"

### 7. Verify end-to-end
- Open this An Exterior bill in Review → confirm 3 lines appear with the 3 POs auto-linked
- Approve it → confirm `bill_lines.purchase_order_id` is populated for all 3 lines
- Check the Manage Bills table badge shows "Matched" not "No PO"
- Spot-check a single-line invoice to make sure we didn't break the simple case

## Out of scope
- Changing how POs themselves are structured
- Touching the journal entry posting logic
- Anything related to the file-preview/Storage RLS work (that's the other open thread)

