/**
 * Smart PO line matching utility.
 * Scores and ranks PO lines against a bill line item using keyword matching,
 * cost code matching, amount proximity, and exact-amount bonus.
 */

export interface POLineCandidate {
  id: string;
  purchase_order_id: string;
  description: string | null;
  cost_code_id: string | null;
  cost_code_name: string | null;
  amount: number;
  remaining: number;
}

export interface POLineMatch {
  poLineId: string;
  poId: string;
  confidence: number;
}

/** Stop words to ignore during keyword matching */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'for', 'on', 'at', 'by',
  'is', 'it', 'as', 'be', 'do', 'no', 'so', 'if', 'up', 'all', 'per', 'with',
  'labor', 'material', 'materials', 'invoice', 'payment', 'total', 'amount',
  'balance', 'draw', 'added', 'men', 'hrs',
]);

/**
 * Simple stemmer: strip common English suffixes so "decks"="deck", "framing"="frame", etc.
 */
function stem(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('ing') && word.length > 5) return word.slice(0, -3);
  if (word.endsWith('tion') && word.length > 5) return word.slice(0, -4);
  if (word.endsWith('ed') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('es') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) return word.slice(0, -1);
  return word;
}

/**
 * Tokenize a string into meaningful keywords with stemming.
 */
function tokenize(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t))
    .map(stem);
}

/**
 * Bidirectional keyword overlap score.
 * Takes the MAX of (bill→PO ratio, PO→bill ratio) so that
 * "Siding draw" vs "Siding" = max(0.5, 1.0) = 1.0.
 */
function keywordScore(billTokens: string[], poTokens: string[]): number {
  if (billTokens.length === 0 || poTokens.length === 0) return 0;

  const matchCount = (source: string[], target: string[]) => {
    let count = 0;
    for (const s of source) {
      if (target.some(t => t === s || t.includes(s) || s.includes(t))) count++;
    }
    return count;
  };

  const billToPo = matchCount(billTokens, poTokens) / billTokens.length;
  const poToBill = matchCount(poTokens, billTokens) / poTokens.length;

  return Math.max(billToPo, poToBill);
}

/**
 * Amount proximity score (0-1). Compares bill amount to PO remaining and total.
 */
function amountProximityScore(billAmount: number, poAmount: number, poRemaining: number): number {
  if (billAmount <= 0) return 0;
  const diffRemaining = Math.abs(billAmount - poRemaining);
  const diffTotal = Math.abs(billAmount - poAmount);
  const bestDiff = Math.min(diffRemaining, diffTotal);
  const maxVal = Math.max(billAmount, poRemaining, poAmount, 1);
  return Math.max(0, 1 - (bestDiff / maxVal));
}

/**
 * Exact/near-exact amount bonus (0-1).
 * 1.0 if within 1%, 0.5 if within 5%, 0.25 if within 10%, 0 beyond.
 */
function exactAmountBonus(billAmount: number, poAmount: number, poRemaining: number): number {
  if (billAmount <= 0) return 0;

  const pctDiffRemaining = poRemaining > 0 ? Math.abs(billAmount - poRemaining) / poRemaining : 1;
  const pctDiffTotal = poAmount > 0 ? Math.abs(billAmount - poAmount) / poAmount : 1;
  const bestPct = Math.min(pctDiffRemaining, pctDiffTotal);

  if (bestPct <= 0.01) return 1.0;   // within 1%
  if (bestPct <= 0.05) return 0.7;   // within 5%
  if (bestPct <= 0.10) return 0.4;   // within 10%
  if (bestPct <= 0.20) return 0.15;  // within 20%
  return 0;
}

/**
 * Scoring weights:
 * - Keyword match (bidirectional): 35
 * - Cost code match: 25
 * - Amount proximity: 15
 * - Exact/near-exact amount bonus: 25
 */
export function matchBillLineToPOLines(
  billMemo: string,
  billAmount: number,
  billCostCodeId: string | undefined,
  poLines: POLineCandidate[]
): POLineMatch[] {
  if (!poLines || poLines.length === 0) return [];

  const billTokens = tokenize(billMemo);

  const scored: POLineMatch[] = poLines.map(line => {
    const poText = [line.description, line.cost_code_name].filter(Boolean).join(' ');
    const poTokens = tokenize(poText);
    const kw = keywordScore(billTokens, poTokens);

    const ccMatch = billCostCodeId && line.cost_code_id && billCostCodeId === line.cost_code_id ? 1 : 0;

    const amt = amountProximityScore(billAmount, line.amount, line.remaining);
    const exactBonus = exactAmountBonus(billAmount, line.amount, line.remaining);

    const raw = (kw * 35) + (ccMatch * 25) + (amt * 15) + (exactBonus * 25);
    const confidence = Math.min(100, Math.round(raw));

    return { poLineId: line.id, poId: line.purchase_order_id, confidence };
  });

  scored.sort((a, b) => b.confidence - a.confidence);
  return scored;
}

/**
 * Get the best match, returning undefined if below threshold.
 */
export function getBestPOLineMatch(
  billMemo: string,
  billAmount: number,
  billCostCodeId: string | undefined,
  poLines: POLineCandidate[],
  minConfidence: number = 50
): POLineMatch | undefined {
  const matches = matchBillLineToPOLines(billMemo, billAmount, billCostCodeId, poLines);
  if (matches.length === 0) return undefined;
  const best = matches[0];
  return best.confidence >= minConfidence ? best : undefined;
}
