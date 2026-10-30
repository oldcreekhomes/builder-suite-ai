// @ts-ignore
import { expect, test } from "bun:test";
import { daysLate, isLateBill, isRejectedBill, isCountableBill } from "./billIssues";

test("bill due before today is late, with day count", () => {
  expect(isLateBill({ status: "draft", due_date: "2026-09-30" }, "2026-10-30")).toBe(true);
  expect(daysLate("2026-09-30", "2026-10-30")).toBe(30);
});

test("bill due today or with no due date is not late", () => {
  expect(isLateBill({ status: "posted", due_date: "2026-10-30" }, "2026-10-30")).toBe(false);
  expect(isLateBill({ status: "posted", due_date: null }, "2026-10-30")).toBe(false);
  expect(daysLate(null, "2026-10-30")).toBe(0);
});

test("void bills are rejected; archived and reversal bills are excluded", () => {
  expect(isRejectedBill({ status: "void", due_date: null })).toBe(true);
  expect(isCountableBill({ status: "void", due_date: null, archived_at: "2026-01-01" })).toBe(false);
  expect(isCountableBill({ status: "draft", due_date: null, is_reversal: true })).toBe(false);
  expect(isCountableBill({ status: "posted", due_date: "2025-12-15", reversed_by_id: "abc" })).toBe(false);
});

test("Paid at Purchase bills are never late, but can still be rejected", () => {
  const b = { status: "void", due_date: "2026-01-01", terms: "paid-at-purchase" };
  expect(isLateBill(b, "2026-10-30")).toBe(false);
  expect(isRejectedBill(b)).toBe(true);
});

test("archived bills are never late", () => {
  expect(isLateBill({ status: "void", due_date: "2026-01-01", archived_at: "2026-02-01" }, "2026-10-30")).toBe(false);
});
