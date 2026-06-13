/**
 * Shared formatter for the "Type" column displayed in every financial
 * transaction / account-detail dialog (Balance Sheet, Income Statement,
 * Job Costs, Bank Reconciliation, Transaction Details, etc).
 *
 * Centralized so labels like "JE" stay consistent everywhere — change once,
 * applies across all financial dialogs.
 */
export function getTransactionTypeLabel(sourceType: string | null | undefined): string {
  switch (sourceType) {
    case 'bill':
      return 'Bill';
    case 'bill_payment':
      return 'Bill Pmt - Check';
    case 'consolidated_bill_payment':
      return 'Bill Pmt - Check';
    case 'check':
      return 'Check';
    case 'deposit':
      return 'Deposit';
    case 'credit_card':
      return 'Credit Card';
    case 'manual':
    case 'journal_entry':
    case 'Journal Entry':
      return 'JE';
    default:
      return sourceType || '-';
  }
}
