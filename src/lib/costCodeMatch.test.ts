// @ts-ignore - bun's built-in test runner (matches existing project tests)
import { describe, expect, it } from "bun:test";
import { displayMatchesCostCode, resolveCostCode } from "./costCodeMatch";

const codes = [
  { id: "a", code: "2240", name: "Legal - Land Use" },
  { id: "b", code: "1000", name: "LAND ACQUISITION COSTS" },
  { id: "c", code: "1005", name: "Back Charges" },
];

describe("resolveCostCode", () => {
  it("resolves a bare code", () => {
    expect(resolveCostCode("2240", codes)?.id).toBe("a");
  });
  it("resolves 'code - name'", () => {
    expect(resolveCostCode("2240 - Legal - Land Use", codes)?.id).toBe("a");
  });
  it("resolves 'code: name' (the format that previously failed)", () => {
    expect(resolveCostCode("2240: Legal - Land Use", codes)?.id).toBe("a");
  });
  it("resolves 'code:' with nothing after", () => {
    expect(resolveCostCode("2240:", codes)?.id).toBe("a");
  });
  it("resolves nothing for unknown text", () => {
    expect(resolveCostCode("9999 nonsense", codes)).toBeNull();
  });
});

describe("displayMatchesCostCode", () => {
  it("flags text showing 2240 while 1000 is attached", () => {
    expect(displayMatchesCostCode("2240: Legal - Land Use", "1000")).toBe(false);
  });
  it("accepts matching text", () => {
    expect(displayMatchesCostCode("2240 - Legal - Land Use", "2240")).toBe(true);
  });
});
