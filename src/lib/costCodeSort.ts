export const codeCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export const compareCostCodeStrings = (a: string, b: string) =>
  codeCollator.compare(String(a ?? "").trim(), String(b ?? "").trim());

export const compareCostCodes = <T extends { code: string }>(a: T, b: T) =>
  compareCostCodeStrings(a.code, b.code);
