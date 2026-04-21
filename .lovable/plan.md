

## Fix the $17.03 discrepancy between A/P Aging and Balance Sheet

### What I found

| Report | Total |
|---|---|
| A/P Aging Detail (PDF) — **correct** | $161,894.60 |
| Balance Sheet AP 2010 — **wrong** | $161,877.57 |
| Difference | **$17.03** |

The $17.03 traces to a **single bill posted with a wrong journal-entry date**:

- **Vendor:** Exxon Express Pay
- **Bill ID:** `41b62703-35d3-4536-a3cf-9d25cab40f8a`
- **Reference:** `087435`
- **Amount:** $17.03
- **`bills.bill_date`:** 2026-02-24 ✓ (correct, within the report period)
- **Bill JE `entry_date`:** **2026-03-31** ✗ (wrong — outside the report period)
- **Payment JE `entry_date`:** 2026-02-24 ✓ (correct)

As of 2026-02-28, the Balance Sheet sees the **payment** ($17.03 debit to AP) but **not** the bill ($17.03 credit to AP, dated 3/31), so AP is understated by exactly $17.03.

The A/P Aging is correct because it sums `bill.total_amount − payments` using `bill_date`, not the JE date — so it correctly excludes this paid-off $17.03 bill from the open balance and reflects the right total.

This is the only such mismatch on this project (1 of 227 bills had a JE date later than its bill date).

### The fix — one-time data correction

Update the bill's posting journal entry to use the correct date:

```sql
UPDATE journal_entries
SET entry_date = '2026-02-24'
WHERE id = '95dad7f2-6ca5-44fa-ad23-7739dbfb4dfd';
-- source_type='bill', source_id=41b62703... (Exxon ref 087435)
```

This is a single-row update on `journal_entries.entry_date`. It does not change the JE lines, the AP balance long-term, or any other report — it just shifts the recognition date from 3/31 back to the correct bill date of 2/24, which is what the bill itself says.

### Verification after the fix

- Re-run Balance Sheet as of 2026-02-28 → AP 2010 = **$161,894.60** (matches A/P Aging exactly)
- Re-run Balance Sheet as of 2026-03-31 → AP 2010 unchanged (the entry still falls within range)
- A/P Aging Detail as of 2026-02-28 → still $161,894.60
- No other bills, payments, or accounts are touched

### Out of scope (separate items, not affecting this $17.03)
- The credit memo `OCH-02302` (JZ Structural, -$500) is fully applied and correctly excluded from the printed A/P Aging. It is also already correctly reflected in BS via the JE that applied it. No action needed.
- Why this bill was posted with a 3/31 JE date in the first place is a workflow question (likely the user backdated `bill_date` after entry but didn't change the JE date). If you want me to investigate the bill-create code path so this can't happen again, that's a separate task — say the word and I'll dig in.

