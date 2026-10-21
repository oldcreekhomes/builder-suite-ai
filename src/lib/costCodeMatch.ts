export interface MatchableCostCode {
  id: string;
  code: string;
  name: string;
}

/**
 * Pulls the leading cost code out of display text such as
 * "2240", "2240 - Legal - Land Use", "2240: Legal - Land Use" or "2240:".
 */
export function extractCostCodeToken(text: string): string {
  const trimmed = (text || "").trim();
  if (!trimmed) return "";
  const first = trimmed.split(/\s+-\s+|:|\s+/)[0] || "";
  return first.trim();
}

/** Resolves typed/pasted text to exactly one cost code, or null. */
export function resolveCostCode<T extends MatchableCostCode>(
  text: string,
  costCodes: T[],
): T | null {
  const query = (text || "").trim();
  if (!query) return null;

  const token = extractCostCodeToken(query);
  if (token) {
    const exact = costCodes.find((cc) => cc.code === token)
      ?? costCodes.find((cc) => cc.code.toLowerCase() === token.toLowerCase());
    if (exact) return exact;
  }

  const normalized = query.toLowerCase();
  const full = costCodes.find((cc) =>
    `${cc.code} - ${cc.name}`.toLowerCase() === normalized ||
    `${cc.code}: ${cc.name}`.toLowerCase() === normalized ||
    `${cc.code} ${cc.name}`.toLowerCase() === normalized,
  );
  if (full) return full;

  const tokens = normalized.split(/[-:\s]+/).filter(Boolean);
  if (tokens.length === 0) return null;
  const matches = costCodes.filter((cc) =>
    tokens.every((t) => cc.code.toLowerCase().includes(t) || cc.name.toLowerCase().includes(t)),
  );
  return matches.length === 1 ? matches[0] : null;
}

/** True when the visible text refers to the cost code that will actually be saved. */
export function displayMatchesCostCode(display: string, code: string | undefined | null): boolean {
  const token = extractCostCodeToken(display);
  if (!token) return true; // empty text is handled by required-field validation
  if (!code) return false;
  return token.toLowerCase() === code.toLowerCase();
}
