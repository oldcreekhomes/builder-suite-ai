# Fix the 1-cent difference in the emailed A/P report

## Which number is right
**$22,987.73 is correct.** It matches the A/P report on screen and the Balance Sheet, which both read straight from the books. The emailed PDF ($22,987.72) is wrong.

## Why the email is off
The email report and the on-screen report use slightly different rules for which bills to list:
- On screen: any bill with $0.01 or more still open is listed.
- Email: a bill with exactly $0.01 open is dropped.

At 412 E Nelson as of 5/31/2026 there is a bill with $0.01 open, so the email leaves it out and its total comes up a penny short.

## The fix
1. Make the email use the same rule as the screen, so a $0.01 bill is listed and counted.
2. Add up the email total in whole cents so it can't drift from the screen.
3. Make the email read all A/P entries even on large jobs (no 1,000-row cutoff), the same way the screen does.
4. Check the 412 E Nelson numbers from the data: the email total should come out to $22,987.73.

No bills, payments or accounting entries change, only how the emailed PDF is built. This applies to every job.

## Separate question
The $0.01 bill is probably another penny left over from a split bill, like Oxford and Oceanwatch. Once the email matches, I can show you which bill it is so you can decide whether to clear it.

## Technical details
- `src/components/accounting/SendReportsDialog.tsx`: change `Math.abs(open) <= 0.01` to the screen's `>= 0.005` rule, round each open balance and the grand total to cents, and page through `journal_entry_lines` instead of doing one capped query.
- Add a small test for the inclusion rule (a $0.01 open balance is included; $0.004 is not).
