# Fix cost codes that look changed but don't save (Wire Gill 14020)

## What happened
- Bill 14020 (Wire Gill, LLP, $1,402.50) did save at 9:11 AM, but only line 1 has 2240. Lines 2–4 still have 1000, 1005 and 1020 underneath.
- The 2240 on lines 2–4 was typed or pasted as text ("2240: Legal - Land Use") and never picked from the list. The cost code box accepts that text and shows it, but it can't match "2240:" with the colon to a real cost code. So the old code stays attached and gets saved again. Nothing warns you.
- Each time you reopen the bill, the old codes come back. That's why changing them 3 times did nothing.

## Fix
1. **Repair this bill:** set all 5 saved lines on bill 14020 to 2240 - Legal - Land Use. (The 9/18 "Emails with staff" line is stored as two halves of $63.75 each.) It's still a draft, so nothing has posted to the books. Amounts, descriptions and the total stay the same.
2. **Make the cost code box recognize what you type:** "2240", "2240 - Legal - Land Use" and "2240: Legal - Land Use" should all pick 2240 when you tab or click away.
3. **Never show a code that isn't the one being saved:** if the text in the box doesn't match a real cost code when you leave it, the box goes back to the code that's really attached and turns red with "Pick a cost code from the list."
4. **Block the save if anything still doesn't match:** Save Changes will stop with a message naming the line, instead of quietly saving the old code.

This applies everywhere the same cost code box is used: Edit Bill, Enter Bills, Write Checks, Credit Cards, Multiple Checks and the other screens that share it. Amounts, lots and purchase orders aren't affected.

## Technical details
- Data: update `bill_lines.cost_code_id` to `78319ad4-1935-47ca-b75d-0a2f330af444` (2240) for bill `f5450217-c462-4270-9505-b206335548ea`. It's a draft, so there are no journal entries to change.
- `src/components/CostCodeSearchInput.tsx`:
  - `attemptAutoSelect` strips everything after the code (`:`, ` - ` or a space) before the exact code match, and matches the `code: name` format too.
  - Track the last confirmed selection. On blur with no match, put back the last confirmed display text, call `onChange` with it, and show an inline error state through the existing shadcn input `aria-invalid`/destructive border.
  - Pull the matching logic into a small pure helper (`src/lib/costCodeMatch.ts`), with tests: "2240", "2240 - Legal - Land Use" and "2240: Legal - Land Use" all resolve to 2240; "2240:" with nothing else still resolves; unknown text resolves to nothing.
- `src/components/bills/EditBillDialog.tsx`: before saving, check that each job cost row's display text begins with its selected cost code's code. If not, show a toast naming the line and don't save. Both the draft and approved save paths use this check.
- Record the rule in `AGENTS.md`: "Cost code pickers only show text that matches the selected id; unmatched text reverts on blur — prevents silently saving a stale code."
