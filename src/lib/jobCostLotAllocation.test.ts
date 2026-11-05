// @ts-ignore
import { describe, expect, test } from "bun:test";
import { actualsByCostCodeForLot } from "./jobCostLotAllocation";

const lines = [
  { cost_code_id: "2050", lot_id: "L1", debit: 2616, credit: 0 },
  { cost_code_id: "2050", lot_id: "L2", debit: 2616, credit: 0 },
  { cost_code_id: "2050", lot_id: null, debit: 23230, credit: 0 },
];

describe("job cost lot actuals", () => {
  test("a lot shows only its own tagged costs", () => {
    const r = actualsByCostCodeForLot(lines, "L1");
    expect(r.assigned["2050"]).toBe(2616);
  });

  test("untagged costs are reported separately, not added to the lot", () => {
    const r = actualsByCostCodeForLot(lines, "L2");
    expect(r.unassigned["2050"]).toBe(23230);
    expect(r.assigned["2050"]).toBe(2616);
  });

  test("whole job shows the full total", () => {
    const r = actualsByCostCodeForLot(lines, null);
    expect(r.assigned["2050"]).toBe(28462);
    expect(Object.keys(r.unassigned).length).toBe(0);
  });
});
