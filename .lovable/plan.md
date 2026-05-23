
## Goal
Re-date Oceanwatch Court (`project_id f13eae11…afe340`) transactions on Atlantic Union Bank (`account_id 27ed0c3a…1585`) so each one falls on the bank's posting date for Jan 2026 and Feb 2026.

For each transaction I'll update both the source row (`bills` / `bill_payments` / `checks` / `deposits`) AND its `journal_entries.entry_date`, so the bank register, reports, and reconciliation all line up.

## January 2026 date corrections (30 transactions)

| Current BS date | New date | Amount | Description |
|---|---|---|---|
| 01-01 | 01-02 | $29.84 | Check to Shell |
| 01-01 | 01-02 | $8.30 | Check to Starbucks |
| 01-02 | 01-05 | $58.30 | Bill pmt ref 01052026 (Murphy's) |
| 01-04 | 01-05 | $49.97 | Check to Murphy's |
| 01-05 | 01-06 | $2,208.33 | Check to Ellen Louise Felker |
| 01-07 | 01-08 | $63.85 | Check to Murphy's |
| 01-09 | 01-12 | $3,506.25 | Bill pmt ref 296 (ELG) |
| 01-09 | 01-12 | $1,451.56 | Bill pmt ref 276 (ELG) |
| 01-09 | 01-12 | $479.81 | Bill pmt ref 28484 |
| 01-09 | 01-12 | $464.29 | Bill pmt ref 28631 |
| 01-09 | 01-12 | $409.00 | Bill pmt ref 28149 |
| 01-09 | 01-12 | $363.00 | Bill pmt ref 26181 (Seaboard) |
| 01-11 | 01-12 | $16.74 | Check to Wawa |
| 01-12 | 01-14 | $5,330.00 | Bill pmt ref YC8 (JDC Plumbing) |
| 01-12 | 01-14 | $370.00 | Bill pmt ref 12052025 (Terminix) |
| 01-13 | 01-14 | $49.67 | Bill pmt ref 01142026 (Murphy's) |
| 01-14 | 01-15 | $63.93 | Check to Shell |
| 01-15 | 01-13 | $128.10 | Bill pmt ref I46574 (Atlantic OBX) |
| 01-15 | 01-16 | $13,590.06 | Bill pmt ref 48000482289 (Carter Jones) |
| 01-15 | 01-16 | $3,348.06 | Bill pmt ref 48000483364 |
| 01-15 | 01-16 | $1,913.98 | Bill pmt ref 48000482287 |
| 01-15 | 01-16 | $1,514.91 | Bill pmt ref 48000482419 |
| 01-15 | 01-16 | $692.59 | Bill pmt ref 48000481959 |
| 01-15 | 01-16 | $619.46 | Bill pmt ref 48000483651 |
| 01-15 | 01-16 | $560.05 | Bill pmt ref 48000482288 |
| 01-15 | 01-16 | $461.03 | Bill pmt ref 48000483701 |
| 01-15 | 01-16 | $54.69 | Bill pmt ref 48000482638 |
| 01-15 | 01-16 | $79.60 | Check to Mia's Italian Kitchen |
| 01-16 | 01-20 | $63.30 | Check to Union Street Public House |
| 01-24 | 01-26 | $52.00 | Check to Murphy's |
| 01-31 | 02-02 | $21.30 | Check to Seven Eleven |

## February 2026 date corrections (22 transactions)

| Current BS date | New date | Amount | Description |
|---|---|---|---|
| 02-02 | 02-04 | $506.00 | Bill pmt ref 28971 (Wasteland) |
| 02-04 | 02-05 | $58.00 | Check to Murphy's |
| 02-05 | 02-06 | $15.48 | Check to Kisso Asian Bistro |
| 02-06 | 02-11 | $12,463.49 | Bill pmt ref 2005369950-001 (ABC Supply) |
| 02-06 | 02-09 | $785.46 | Bill pmt ref 330540 (Bayco) |
| 02-06 | 02-09 | $736.04 | Bill pmt ref 2005162150-001 (ABC Supply) |
| 02-06 | 02-09 | $44.62 | Check to Seven Eleven |
| 02-09 | 02-11 | $5,255.89 | Bill pmt ref 2005369950-002 (ABC Supply) |
| 02-10 | 02-13 | $569.30 | Bill pmt ref 2814 (J. Alan Electric) |
| 02-11 | 02-13 | $15,000.00 | Bill pmt ref 2814 (J. Alan Electric) |
| 02-13 | 02-17 | $5.20 | Bill pmt ref 02022026-Oceanwatch (Cortes) |
| 02-16 | 02-18 | $1,155.70 | Bill pmt ref 48000485949 (Carter Jones) |
| 02-16 | 02-18 | $404.00 | Bill pmt ref 48000484969 |
| 02-16 | 02-18 | $161.60 | Bill pmt ref 48000485413 |
| 02-16 | 02-18 | $96.99 | Bill pmt ref 48000485415 |
| 02-19 | 02-23 | $315.77 | Bill pmt ref 2005711355-001 (ABC Supply) |
| 02-20 | 02-23 | $2,052.75 | Bill pmt ref 308 (ELG) |
| 02-20 | 02-23 | $1,431.00 | Bill pmt ref 0001313 (ZL Chantry) |
| 02-20 | 02-23 | $498.20 | Bill pmt ref 330891 (Bayco) |
| 02-20 | 02-23 | $38.16 | Bill pmt ref 330890 (Bayco) |
| 02-21 | 02-23 | $82.82 | Check to Piece Out Del Ray |
| 02-22 | 02-23 | $30.08 | Check to Wawa |
| 02-22 | 02-23 | $11.77 | Check to Wawa |
| 02-26 | 02-27 | $1,404.08 | Bill pmt ref 2005904929-001 |
| 02-26 | 02-27 | $289.25 | Bill pmt ref 2005904929-002 |
| 02-26 | 02-27 | $44.99 | Check to White Horse |

## Items I will NOT auto-update (need your call)

These exist in BuilderSuite but don't match the bank statement cleanly:

1. **Duplicate deposit** — Two $117.33 deposits on Feb 26 (je `f9fb15fe…` and `03c99564…`). Bank only shows one. Looks like one should be deleted.
2. **Feb 23 ATM cash check $203** vs bank $202 ATM + $3 fee — amount mismatch, not just date.
3. **Feb 23 second Cash check $2** — no $2 on bank.
4. **Feb 26 bill pmt $635.89** (ref 2005904415-001) — doesn't appear on Feb statement.
5. **Feb 27 Murphy's checks $103.52 and $15.54** — bank shows ABC Supply $135.37 instead.
6. **Feb 28 Piece Out check $140.55** — doesn't appear on Feb statement.

I'll flag these in chat after the date updates; tell me which to delete/edit and I'll handle them separately.

## Technical details

For each affected `journal_entry_id`, run:
```sql
UPDATE journal_entries SET entry_date = '<new>' WHERE id = '<je_id>';
UPDATE bills          SET bill_date  = '<new>' WHERE id = '<source_id>'  -- if src='bill_payment' update the related bill_payment record instead
UPDATE bill_payments  SET payment_date = '<new>' WHERE id = '<source_id>' -- if src='bill_payment'
UPDATE checks         SET check_date   = '<new>' WHERE id = '<source_id>' -- if src='check'
UPDATE deposits       SET deposit_date = '<new>' WHERE id = '<source_id>' -- if src='deposit'
```
I'll first inspect the actual column names on each source table to be safe (bills uses `bill_date`, etc.), then issue these as a single migration so it's atomic and reversible.

After running, your bank-account register for Oceanwatch through 02/28 will tie exactly to the Feb 27 ending balance of $36,933.39 (project-scoped slice of it).
