

## Fix Bill #20316 Data — Correct Rounding Error

### Problem
Bill #20316 has incorrect line item amounts due to the original 0.5 qty × cost calculation creating rounding issues:
- **Current DB**: Line 1: qty=0.5, cost=16.97, amount=8.49 | Line 2: qty=0.5, cost=16.99, amount=8.50 | Total=16.98
- **Correct values**: Line 1: qty=1, cost=8.48, amount=8.48 | Line 2: qty=1, cost=8.49, amount=8.49 | Total=16.97

This requires direct database corrections since the UI correctly prevents editing amounts on posted bills.

### Plan

**Step 1: Update `bill_lines`** — Set quantity=1, correct unit_cost and amount for both lines:
- Line `340874ca` → qty=1, unit_cost=8.48, amount=8.48
- Line `346f2b5f` → qty=1, unit_cost=8.49, amount=8.49

**Step 2: Update `bills` total** — Set total_amount=16.97 on bill `271ee4cc`

**Step 3: Update `journal_entry_lines`** — Fix the 3 journal entry lines on JE `9479de8a`:
- JEL `e7bcfe09` (line 1): debit=8.48
- JEL `7f08dfab` (line 2): debit=8.49
- JEL `04c3b056` (line 3, AP credit): credit=16.97

All updates will be executed via direct SQL statements against Supabase.

### Files
No code file changes — database-only fix.

