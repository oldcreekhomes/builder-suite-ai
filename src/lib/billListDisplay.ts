// Shared display helper for bill list tables (Enter with AI / Review / Rejected /
// Approved / Paid). Groups bill_lines by their visible cost code / account label
// so a bill split across many lots shows ONE row per cost code, not one per line.

export interface BillLineLike {
  line_type?: string | null;
  amount?: number | null;
  cost_codes?: { code?: string | null; name?: string | null } | null;
  accounts?: { code?: string | null; name?: string | null } | null;
  // Pending-bill (Enter with AI) shape
  cost_code_name?: string | null;
  account_name?: string | null;
}

export interface CostCodeBreakdownItem {
  name: string;
  amount: number;
}

export interface CostCodeDisplayResult {
  display: string;
  breakdown: CostCodeBreakdownItem[];
  total: number;
  count: number;
}

function nameForLine(line: BillLineLike): string {
  const fallback = line.line_type === 'expense' ? 'No Account' : 'No Cost Code';
  if (line.cost_codes && (line.cost_codes.code || line.cost_codes.name)) {
    return `${line.cost_codes.code ?? ''}: ${line.cost_codes.name ?? ''}`.trim();
  }
  if (line.accounts && (line.accounts.code || line.accounts.name)) {
    return `${line.accounts.code ?? ''}: ${line.accounts.name ?? ''}`.trim();
  }
  const raw =
    line.line_type === 'job_cost'
      ? line.cost_code_name
      : line.line_type === 'expense'
        ? line.account_name
        : (line.cost_code_name || line.account_name);
  return (raw && raw.trim()) || fallback;
}

export function getBillCostCodeDisplay(lines: BillLineLike[] | null | undefined): CostCodeDisplayResult {
  if (!lines || lines.length === 0) {
    return { display: '-', breakdown: [], total: 0, count: 0 };
  }

  const order: string[] = [];
  const sums = new Map<string, number>();
  for (const line of lines) {
    const name = nameForLine(line);
    if (!sums.has(name)) order.push(name);
    sums.set(name, (sums.get(name) || 0) + (line.amount || 0));
  }

  const breakdown = order.map((name) => ({ name, amount: sums.get(name) || 0 }));
  const total = breakdown.reduce((s, b) => s + b.amount, 0);
  const count = breakdown.length;
  const firstNamed = breakdown.find((b) => b.name !== 'No Cost Code' && b.name !== 'No Account');
  const primary = firstNamed?.name || breakdown[0].name;
  const display = count === 1 ? primary : `${primary} +${count - 1}`;
  return { display, breakdown, total, count };
}
