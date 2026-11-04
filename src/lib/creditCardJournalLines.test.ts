import { describe, it, expect } from 'vitest';
import { buildCreditCardJournalLines } from './creditCardJournalLines';

const JOB = 'job-228';
const CARD = 'acct-2150-05';

describe('buildCreditCardJournalLines', () => {
  it('purchase credits the card account on the same job', () => {
    const lines = buildCreditCardJournalLines({
      transactionType: 'purchase',
      creditCardAccountId: CARD,
      projectId: JOB,
      lines: [{ line_type: 'expense', account_id: 'acct-8270', project_id: JOB, amount: 174.89 }],
    });
    const card = lines.find((l) => l.account_id === CARD)!;
    expect(card.credit).toBe(174.89);
    expect(card.project_id).toBe(JOB);
  });

  it('refund debits the card account on the same job', () => {
    const lines = buildCreditCardJournalLines({
      transactionType: 'refund',
      creditCardAccountId: CARD,
      projectId: JOB,
      lines: [{ line_type: 'expense', account_id: 'acct-8270', project_id: JOB, amount: 50 }],
    });
    const card = lines.find((l) => l.account_id === CARD)!;
    expect(card.debit).toBe(50);
    expect(card.project_id).toBe(JOB);
  });

  it('uses the line job when the header has none', () => {
    const lines = buildCreditCardJournalLines({
      transactionType: 'purchase',
      creditCardAccountId: CARD,
      lines: [{ line_type: 'expense', account_id: 'acct-8270', project_id: JOB, amount: 10 }],
    });
    expect(lines.find((l) => l.account_id === CARD)!.project_id).toBe(JOB);
  });

  it('balances to the cent', () => {
    const lines = buildCreditCardJournalLines({
      transactionType: 'purchase',
      creditCardAccountId: CARD,
      projectId: JOB,
      wipAccountId: 'wip',
      lines: [
        { line_type: 'expense', account_id: 'a', amount: 0.1 },
        { line_type: 'job_cost', cost_code_id: 'cc', amount: 0.2 },
        { line_type: 'expense', account_id: 'b', amount: 33.33 },
      ],
    });
    const d = lines.reduce((s, l) => s + Math.round(l.debit * 100), 0);
    const c = lines.reduce((s, l) => s + Math.round(l.credit * 100), 0);
    expect(d).toBe(3363);
    expect(c).toBe(3363);
  });
});
