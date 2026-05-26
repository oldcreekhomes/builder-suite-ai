## One-time data correction: Dolphin Pool Services bill #18230

Restructure the bill so it matches the vendor's actual 50% draw invoice, then let the existing payment settle it in full. No code changes.

### Current (wrong) state
- Bill 18230: total **$57,831.00**, paid $28,915.50, remaining $28,915.50, status `posted`
- Bill line: $57,831.00 → Cost Code 4920 Pool, Lot 1
- Job-cost JE (02/20): Dr Pool $57,831 / Cr A/P $57,831
- Payment JE (03/03): Dr A/P $28,915.50 / Cr Atlantic Union Bank $28,915.50

### Target (correct) state
- Bill 18230: total **$28,915.50**, paid $28,915.50, remaining **$0**, status **`paid`**
- Bill line: $28,915.50 → Cost Code 4920 Pool, Lot 1 (PO 2026-923T-0077 line preserved)
- Job-cost JE (02/20): Dr Pool **$28,915.50** / Cr A/P **$28,915.50**
- Payment JE (03/03): unchanged — now fully settles the bill
- PO 2026-923T-0077: Billed to Date $28,915.50, Remaining $28,915.50, status **Partially Billed** (rolls up automatically from the bill)

### SQL steps (single migration, transactional)
1. `UPDATE bills` SET `total_amount = 28915.50`, `status = 'paid'` WHERE id = `3ee6bbb9-…630c`
2. `UPDATE bill_lines` SET `amount = 28915.50`, `unit_cost = 28915.50` WHERE bill_id = `3ee6bbb9-…630c` AND line_type = 'job_cost'
3. `UPDATE journal_entry_lines` SET `debit = 28915.50` on the Pool (4920) line, and `credit = 28915.50` on the A/P line, for the 02/20 job-cost JE tied to this bill
4. Leave the 03/03 payment JE and `bill_payments` row untouched
5. Verify post-update: bill total = paid = $28,915.50, balance = 0, JE balances debits = credits, PO Billed-to-Date = $28,915.50

### Future draws (policy confirmed)
- Every invoice reference number must be globally unique per vendor (already enforced)
- Draw #2 will be entered as a new bill against the same PO line, using a distinct reference (e.g. `18230-2`, or whatever the vendor issues). When it posts and is paid, PO Billed-to-Date rolls to $57,831 and the PO closes naturally.
- No app/UI code changes in this task — just the data fix above.
