import { expect, test } from "bun:test";
import { sumBilledPrior } from "./poBilledToDate";

const entries = [
  { bill_id: "a", amount: 11406.3, bill_date: "2026-04-20" },
  { bill_id: "b", amount: 200, bill_date: "2026-05-19" },
  { bill_id: "c", amount: 650, bill_date: "2026-06-23" },
  { bill_id: "d", amount: 2000, bill_date: "2026-07-20" },
  { bill_id: "cur", amount: 875, bill_date: "2026-08-17" },
  { bill_id: "later", amount: 1100, bill_date: "2026-09-18" },
];

test("billed to date counts only earlier bills, not this or later ones", () => {
  expect(sumBilledPrior(entries, "cur", "2026-08-17")).toBe(14256.3);
});

test("first bill on a PO has zero billed to date", () => {
  expect(sumBilledPrior(entries, "a", "2026-04-20")).toBe(0);
});
