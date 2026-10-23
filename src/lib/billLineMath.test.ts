// @ts-ignore - bun's built-in test runner
import { expect, test } from "bun:test";
import { fixSplitLineAmounts } from "./billLineMath";

const line = (q: number, u: number) => ({ line_type: "job_cost", cost_code_id: "c", unit_cost: u, quantity: q, amount: q * u });

test("$216.37 split over 2 lots adds up to $216.37, not $216.38", () => {
  const out = fixSplitLineAmounts([line(0.5, 216.37), line(0.5, 216.37)]);
  expect(out.map((l) => l.amount)).toEqual([108.19, 108.18]);
});

test("split lots always add up exactly to the line total", () => {
  const out = fixSplitLineAmounts([line(0.33, 100), line(0.33, 100), line(0.34, 100)]);
  expect(out.map((l) => l.amount)).toEqual([33, 33, 34]);
  const out2 = fixSplitLineAmounts([line(1, 33.333333), line(1, 33.333333), line(1, 33.333333)]);
  expect(out2.reduce((s, l) => s + l.amount, 0)).toBeCloseTo(100, 2);
});
