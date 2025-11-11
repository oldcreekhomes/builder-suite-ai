export const codeCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

const normalizeCode = (s: string): string =>
  String(s ?? "")
    .trim()
    .replace(/\u200B/g, "") // remove zero-width spaces
    .replace(/\s+/g, ""); // collapse/remove whitespace

const tokenize = (seg: string): string[] => seg.match(/\d+|[^\d]+/g) ?? [];

const compareTokenLists = (aTokens: string[], bTokens: string[]): number => {
  const len = Math.max(aTokens.length, bTokens.length);
  for (let i = 0; i < len; i++) {
    const aTok = aTokens[i] ?? "";
    const bTok = bTokens[i] ?? "";
    if (aTok === bTok) continue;

    const aNum = /^\d+$/.test(aTok);
    const bNum = /^\d+$/.test(bTok);

    if (aNum && bNum) {
      const diff = Number(aTok) - Number(bTok);
      if (diff !== 0) return diff;
      continue;
    }

    if (aNum && !bNum) return -1;
    if (!aNum && bNum) return 1;

    const cmp = aTok.localeCompare(bTok, undefined, { sensitivity: "base" });
    if (cmp !== 0) return cmp;
  }
  return aTokens.length - bTokens.length;
};

const compareSegment = (aSeg: string, bSeg: string): number => {
  if (aSeg === bSeg) return 0;
  return compareTokenLists(tokenize(aSeg), tokenize(bSeg));
};

export const compareCostCodeStrings = (a: string, b: string): number => {
  const A = normalizeCode(a);
  const B = normalizeCode(b);
  if (A === B) return 0;

  const aParts = A.split(".");
  const bParts = B.split(".");
  const max = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < max; i++) {
    const aSeg = aParts[i] ?? "";
    const bSeg = bParts[i] ?? "";
    const cmp = compareSegment(aSeg, bSeg);
    if (cmp !== 0) return cmp;
  }

  // All segments equal; shorter (fewer segments) comes first
  return aParts.length - bParts.length;
};

export const compareCostCodes = <T extends { code: string }>(a: T, b: T) =>
  compareCostCodeStrings(a.code, b.code);
