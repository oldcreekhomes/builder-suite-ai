# Recover the deleted 126 Longview bills and re-pay them from Capital One

## What I confirmed in the database

- The 06/05/2026 "Bill Pmt - Check" payments in your screenshot no longer exist. On 126 Longview only two Capital One payments remain that day: Floor & Decor $969.16 and Home Depot $130.71.
- The bills behind those rows (Green Landscaping $568 / $2,719 / $3,015.25 / $505, Torres Moreno $9,000, LCS Roll-off $508, Raymond Zins $166.67 x2, ConApp Metro $21,965, An Exterior $27,180, Washington Gas $16.97) are not in the bills table for 126 Longview.
- There are no orphaned journal entries, no orphaned bill attachments, and no leftover allocations. Yesterday's register Delete was a hard delete: it removed the payment, its journal entries, and every bill it paid, in one transaction.

So the data cannot be "found" inside the app. It has to come back from a database backup, or be re-entered from the invoices.

## Step 1 - Get the rows back

I only have access to the live database. Restoring a Supabase backup / point-in-time snapshot happens in the Supabase dashboard, which I cannot operate - that one click has to be done by you or whoever has dashboard access. Nothing else in Step 1 is on you: once a restore target exists, I do all the extraction and comparison.

Two ways forward, pick one:

**A. Backup restore (exact recovery, needs one action from you).** Someone with Supabase dashboard access restores a snapshot from before yesterday's deletion into a temporary target - not over the live database. Then I pull the 126 Longview `bills`, `bill_lines`, `bill_attachments`, `bill_payments` and `bill_payment_allocations` for 06/05/2026 out of it and show you the list to confirm before anything is written back.

**B. Rebuild without a restore (no action from you beyond sending invoices).** I re-create the 11 bills from your screenshot using the vendor, cost code, description and amount on each row, plus the invoice PDFs that are still stored from the ML uploads (e.g. Green Landscaping MSG584 $568, ConApp Metro OCH #16130 $21,965). The gap is original invoice numbers, bill dates and lot splits for the rows I have no source document for - I'd flag each one and ask you for the invoice, or enter it with the payment date as the bill date.


## Step 2 - Re-insert into 126 Longview

For each recovered bill, insert into the live database under project 126 Longview with the original vendor, invoice reference, bill date, description, cost codes, lots, and line amounts, and post the matching bill journal entries (A/P credit, WIP/expense debit). Reference numbers stay exactly as they were so nothing is duplicated - I check first that no bill with the same vendor + reference already exists.

## Step 3 - Mark them all paid from Capital One on 06/05/2026

Create one consolidated `bill_payments` record per vendor, dated **06/05/2026**, payment account **Capital One**, project **126 Longview only**, with allocations covering each bill in full. Post the payment journal entries (debit A/P, credit Capital One), set `amount_paid` and status `paid` on each bill. Cent-precise math throughout, and I verify the Capital One register and the balance sheet move by exactly the sum of the restored payments.

## Step 4 - Verification

- The bills appear on the Paid tab of Manage Bills for 126 Longview with the 06/05/2026 payment date.
- The Capital One register shows the payment rows again.
- Job costs / budget actuals for 126 Longview return to their pre-deletion totals.

## Step 5 - Stop this from happening again

The register's Delete on a consolidated bill payment currently deletes the underlying bills permanently. I'll change it so Delete removes only the payment and returns the bills to Approved (unpaid), with bill deletion left to Manage Bills where it belongs. That way an accidental delete in the register can never wipe invoice history again.

## Technical notes

- Project id: `e5439be5-1658-4a0c-a6d1-c1e03d9eae68` (126 Longview Drive). Capital One account id: `7b456e28-9eec-44cb-9f01-c745cc70867c`.
- Restoration writes go through the insert tool (bills, bill_lines, journal_entries, journal_entry_lines, bill_payments, bill_payment_allocations); no schema change is needed.
- Step 5 touches `delete_consolidated_bill_payment` (drop the `delete_bill_with_journal_entries` loop, restore bill balances instead) and the confirmation copy in `src/components/accounting/AccountDetailDialog.tsx`.
