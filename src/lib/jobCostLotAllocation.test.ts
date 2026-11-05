import { describe, expect, test } from "bun:test";
import { actualsByCostCodeForLot, lotShareOfUnassigned } from "./jobCostLotAllocation";

const lots = ["L1", "L2"];
const lines = [
  { cost_code_id: "2050", lot_id: "L1", debit: 2616, credit: 0 },
  { cost_code_id: "2050", lot_id: "L2", debit: 2616, credit: 0 },
  { cost_code_id: "2050", lot_id: null, debit: 23230, credit: 0 },
];

describe("job cost lot allocation", () => {
  test("unassigned $23,230 splits $11,615 per lot", () => {
    expect(lotShareOfUnassigned(23230, lots, "L1")).toBe(11615);
    expect(lotShareOfUnassigned(23230, lots, "L2")).toBe(11615);
  });

  test("lots sum to the project total", () => {
    const l1 = actualsByCostCodeForLot(lines, "L1", lots)["2050"];
    const l2 = actualsByCostCodeForLot(lines, "L2", lots)["2050"];
    const all = actualsByCostCodeForLot(lines, null, lots)["2050"];
    expect(l1).toBe(14231);
    expect(l2).toBe(14231);
    expect(all).toBe(28462);
  });

  test("odd cent goes to the last lot", () => {
    expect(lotShareOfUnassigned(0.03, lots, "L1")).toBe(0.01);
    expect(lotShareOfUnassigned(0.03, lots, "L2")).toBe(0.02);
  });
});
