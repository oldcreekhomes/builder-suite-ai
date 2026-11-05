// @ts-ignore
import { expect, test } from "bun:test";
import { jobCostLinesMissingLot } from "./billLotRequired";

test("job with 2+ lots requires a lot on every job cost line", () => {
  expect(jobCostLinesMissingLot([{ lotId: "L1", amount: "10" }, { lotId: "", amount: "5" }], 2)).toEqual([2]);
});

test("single-lot job never blocks", () => {
  expect(jobCostLinesMissingLot([{ lotId: "", amount: "5" }], 1)).toEqual([]);
});
