import { describe, expect, test } from "bun:test";
import { cashPositionTotals, scopeCashPositionRows } from "./cashPositionScope";

const projects = [
  { id: "nob", accounting_manager: "erica", construction_manager: "matt" },
  { id: "princess", accounting_manager: "matt", construction_manager: "erica" },
  { id: "unassigned", accounting_manager: null, construction_manager: "erica" },
];
const rows = [
  { project_id: "nob", bank_balance: 337804.96, approved_due: 192202.09 },
  { project_id: "princess", bank_balance: 20835.42, approved_due: 6132.28 },
  { project_id: "unassigned", bank_balance: 100, approved_due: 50 },
];

describe("Cash Position dashboard scope", () => {
  test("Erica sees only her Accounting Manager projects", () => {
    expect(scopeCashPositionRows(rows, projects, "accounting-manager", "erica").map(r => r.project_id)).toEqual(["nob"]);
  });
  test("construction manager assignment and unassigned projects do not qualify", () => {
    expect(scopeCashPositionRows(rows.slice(1), projects, "accounting-manager", "erica")).toEqual([]);
  });
  test("another manager sees only their own projects", () => {
    expect(scopeCashPositionRows(rows, projects, "accounting-manager", "matt").map(r => r.project_id)).toEqual(["princess"]);
  });
  test("no matching manager never falls back to company rows", () => {
    expect(scopeCashPositionRows(rows, projects, "accounting-manager", "other")).toEqual([]);
  });
  test("no user yields no rows", () => {
    expect(scopeCashPositionRows(rows, projects, "accounting-manager")).toEqual([]);
    expect(scopeCashPositionRows(rows, projects, "company")).toEqual([]);
  });
  test("Accountant scope preserves all rows", () => {
    expect(scopeCashPositionRows(rows, projects, "company", "erica")).toEqual(rows);
  });
  test("filtered totals use only the manager's projects with exact cents", () => {
    const selected = scopeCashPositionRows(rows, projects, "accounting-manager", "erica");
    expect(cashPositionTotals(selected)).toEqual({ bank: 337804.96, due: 192202.09, net: 145602.87 });
  });
});