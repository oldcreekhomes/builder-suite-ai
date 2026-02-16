/**
 * Smart PO line matching utility.
 * Scores and ranks PO lines against a bill line item using keyword matching,
 * cost code matching, and amount proximity.
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
]);

/**
 * Tokenize a string into meaningful keywords.
 * Strips punctuation, lowercases, removes stop words and short tokens.
 */
function tokenize(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

/**
 * Calculate keyword overlap score between two token sets.
 * Uses a combination of exact match ratio and substring containment.
 * Returns 0-1.
 */
function keywordScore(billTokens: string[], poTokens: string[]): number {
  if (billTokens.length === 0 || poTokens.length === 0) return 0;

  let matchCount = 0;

  for (const bt of billTokens) {
    // Check exact match or substring containment in either direction
    const hasMatch = poTokens.some(
      pt => pt === bt || pt.includes(bt) || bt.includes(pt)
    );
    if (hasMatch) matchCount++;
  }

  // Ratio of bill tokens that matched something in PO
  return matchCount / billTokens.length;
}

/**
 * Calculate amount proximity score.
 * Compares bill amount to both PO line total amount and remaining amount.
 * Returns 0-1 where 1 = exact match.
 */
function amountProximityScore(billAmount: number, poAmount: number, poRemaining: number): number {
  if (billAmount <= 0) return 0;

  // Compare against remaining (most relevant) and total amount
  const diffRemaining = Math.abs(billAmount - poRemaining);
  const diffTotal = Math.abs(billAmount - poAmount);
  const bestDiff = Math.min(diffRemaining, diffTotal);
  const maxVal = Math.max(billAmount, poRemaining, poAmount, 1);

  // Score: 1 when exact, decreasing as diff grows
  const raw = 1 - (bestDiff / maxVal);
  return Math.max(0, raw);
}

/**
 * Match a bill line item against all available PO lines and return
 * ranked matches with confidence scores (0-100).
 *
 * Scoring weights:
 * - Keyword match: 45%
 * - Cost code match: 30%
 * - Amount proximity: 25%
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
    // 1. Keyword score (bill memo vs PO line description + cost code name)
    const poText = [line.description, line.cost_code_name].filter(Boolean).join(' ');
    const poTokens = tokenize(poText);
    const kw = keywordScore(billTokens, poTokens);

    // 2. Cost code match (binary)
    const ccMatch = billCostCodeId && line.cost_code_id && billCostCodeId === line.cost_code_id
      ? 1 : 0;

    // 3. Amount proximity
    const amt = amountProximityScore(billAmount, line.amount, line.remaining);

    // Weighted sum
    const raw = (kw * 45) + (ccMatch * 30) + (amt * 25);

    // Cap at 100
    const confidence = Math.min(100, Math.round(raw));

    return {
      poLineId: line.id,
      poId: line.purchase_order_id,
      confidence,
    };
  });

  // Sort descending by confidence
  scored.sort((a, b) => b.confidence - a.confidence);

  return scored;
}

/**
 * Get the best match for a bill line, returning undefined if confidence is below threshold.
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
