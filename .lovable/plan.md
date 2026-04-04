

## Fix: A/P Aging vs Balance Sheet $150 Discrepancy

### Root Cause

The previous credit fix for OCH-02302 added a **$150 debit to A/P** (line 3 on JE `4b3dbb7c`). This extra A/P debit reduces the Balance Sheet A/P by $150, but the A/P Aging report (which calculates from bills data) has no way to account for arbitrary A/P debit adjustments. Result:

- Balance Sheet A/P: **$147,414.12** (includes the -$150 A/P debit)
- A/P Aging total: **$147,564.12** (bills-based, doesn't see the debit)

### Fix

Change line 3 of JE `4b3dbb7c` from **Debit A/P (2010) $150** to **Debit WIP (1430) $150**. The credit memo originally reduced WIP by $500 (posting JE `4cf0fee1`). Attributing $150 back to WIP is the correct offset — it shouldn't reduce A/P twice.

**After the fix:**
- JE `4b3dbb7c`: Credit A/P $500, Debit Cash $350, Debit WIP $150 → balanced
- BS A/P increases by $150 → **$147,564.12** (matches aging)
- WIP increases by $150 (partial reversal of credit's cost reduction)
- Cash unchanged → bank balance unaffected
- Balance Sheet stays balanced (Assets +$150, Liabilities +$150)

### Implementation
Single database migration: update `journal_entry_lines` set `account_id` to the WIP account (1430) for line `dd13533a`.

### Files changed
- New migration SQL file

