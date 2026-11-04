export interface CreditCardJournalInputLine {
  line_type: 'expense' | 'job_cost';
  account_id?: string | null;
  cost_code_id?: string | null;
  project_id?: string | null;
  lot_id?: string | null;
  amount: number;
  memo?: string | null;
}

export interface CreditCardJournalLine {
  account_id: string;
  debit: number;
  credit: number;
  project_id: string | null;
  cost_code_id: string | null;
  lot_id: string | null;
  memo: string | null;
}

const toCents = (v: number) => Math.round(Number(v || 0) * 100);
const fromCents = (c: number) => c / 100;

/**
 * Builds the double-entry lines for a credit card purchase or refund.
 * The credit card (liability) line always carries the entry's project_id,
 * the same way deposit bank lines do, so project balance sheets balance.
 */
export function buildCreditCardJournalLines(params: {
  transactionType: 'purchase' | 'refund';
  creditCardAccountId: string;
  projectId?: string | null;
  wipAccountId?: string | null;
  lines: CreditCardJournalInputLine[];
  cardMemo?: string | null;
}): CreditCardJournalLine[] {
  const { transactionType, creditCardAccountId, wipAccountId, lines, cardMemo } = params;
  const isPurchase = transactionType === 'purchase';
  const fallbackProject = lines.find((l) => l.project_id)?.project_id ?? null;
  const projectId = params.projectId || fallbackProject;

  const detail: CreditCardJournalLine[] = [];
  let totalCents = 0;
  for (const line of lines) {
    const cents = toCents(line.amount);
    if (cents <= 0) continue;
    const accountId = line.line_type === 'job_cost' ? wipAccountId : line.account_id;
    if (!accountId) {
      throw new Error(
        line.line_type === 'job_cost'
          ? 'No WIP account is set. Please check Settings > Accounting.'
          : 'Select an account for each expense line.'
      );
    }
    totalCents += cents;
    detail.push({
      account_id: accountId,
      debit: isPurchase ? fromCents(cents) : 0,
      credit: isPurchase ? 0 : fromCents(cents),
      project_id: line.project_id || projectId || null,
      cost_code_id: line.cost_code_id || null,
      lot_id: line.lot_id || null,
      memo: line.memo || null,
    });
  }

  const cardLine: CreditCardJournalLine = {
    account_id: creditCardAccountId,
    debit: isPurchase ? 0 : fromCents(totalCents),
    credit: isPurchase ? fromCents(totalCents) : 0,
    project_id: projectId || null,
    cost_code_id: null,
    lot_id: null,
    memo: cardMemo || null,
  };

  return isPurchase ? [...detail, cardLine] : [cardLine, ...detail];
}
