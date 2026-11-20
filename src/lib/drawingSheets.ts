/** Strips "Sheet"/"Sht"/"Dwg" prefixes and "of N" / "/N" page counts: "Sheet 2 of 19" -> "2". Must match add_drawing_version in SQL. */
export function cleanSheetNumber(raw: string | null | undefined): string {
  return (raw || "")
    .trim()
    .replace(/^(sheet|sht|dwg)\.?\s*(no\.?|#)?\s*/i, "")
    .replace(/\s*(of|\/)\s*\d+\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalizes a sheet number so "A-101", "a101" and "A 101" are the same sheet. Must match add_drawing_version in SQL. */
export function sheetKey(sheetNumber: string | null | undefined): string {
  return cleanSheetNumber(sheetNumber).replace(/[\s.\-_]/g, "").toUpperCase();
}

const DISCIPLINES: [RegExp, string][] = [
  [/^G/, "General"], [/^C/, "Civil"], [/^L/, "Landscape"], [/^S/, "Structural"],
  [/^A/, "Architectural"], [/^I/, "Interiors"], [/^M/, "Mechanical"], [/^P/, "Plumbing"],
  [/^E/, "Electrical"], [/^F/, "Fire Protection"], [/^T/, "Title"],
];

export function disciplineFor(sheetNumber: string | null | undefined): string {
  const k = sheetKey(sheetNumber);
  for (const [re, name] of DISCIPLINES) if (re.test(k)) return name;
  return "Other";
}

/** Next version a new upload of this sheet number would get, given current versions by sheet key. */
export function nextVersionFor(sheetNumber: string, currentByKey: Map<string, number>, alreadyInBatch: string[] = []): number {
  const k = sheetKey(sheetNumber);
  const base = currentByKey.get(k) ?? 0;
  return base + 1 + alreadyInBatch.filter((s) => sheetKey(s) === k).length;
}
