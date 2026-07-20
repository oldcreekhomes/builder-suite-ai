## Confirmed diagnosis

The **January activity is correct**:

- 12/31 reconciled ending balance: **$55,487.17**
- January book activity: **+$46,301.04**
- Correct January reconciled balance: **$101,788.21**

The Balance Sheet is **$7,007.20 higher** because the problem carried forward from December:

- **$6,532.45**: December was allowed to complete at `$0.00 difference` even though its selected journal activity did not mathematically reach the statement ending balance.
- **$474.75**: an unreconciled 12/22 deposit remains in the books. This is a legitimate outstanding item unless it should have cleared the bank.

Those two amounts total the exact gap: **$6,532.45 + $474.75 = $7,007.20**.

## Fix plan

1. **Correct reconciliation math**
   - Replace the checks/deposits-only calculation in `ReconcileAccountsContent.tsx` with one canonical calculation that includes every checked transaction type using the correct bank-account debit/credit sign.
   - Ensure checks, deposits, bill payments, consolidated bill payments, and manual journal entries all affect the reconciled balance consistently.

2. **Prevent false completions**
   - Recalculate from the selected transactions immediately before completion rather than trusting stale displayed state.
   - Block completion unless that authoritative result equals the statement ending balance within one cent.
   - Keep the existing warning for legitimate unchecked/outstanding transactions.

3. **Preserve correct Balance Sheet accounting**
   - Keep the Balance Sheet based on posted journal lines; do not force it to equal the bank statement by suppressing valid outstanding items.
   - Verify the Balance Sheet remains balanced after the reconciliation fix.

4. **Repair the historical December carry-forward safely**
   - Recompute the 12/31 reconciliation from its actual selected transactions and identify the transactions responsible for the hidden **$6,532.45**.
   - Correct only the affected reconciliation linkage/state after validating each transaction; do not delete or alter journal amounts.
   - Leave the **$474.75 deposit** outstanding unless its bank-cleared status shows it belongs in the reconciliation.

5. **Validate January end-to-end**
   - Confirm December ending balance rolls into January correctly.
   - Confirm January reconciles to **$101,788.21**.
   - Confirm the Balance Sheet differs only by legitimate outstanding transactions, with the exact difference documented.