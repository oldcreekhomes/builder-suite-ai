// @ts-ignore
import { expect, test } from "bun:test";
import { daysLate, isLateBill, isRejectedBill, isCountableBill, isReviewBill, isApprovedBill } from "./billIssues";

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
  expect(isLateBill({ status: "posted", due_date: "2026-01-01", archived_at: "2026-02-01" }, "2026-10-30")).toBe(false);
});

test("Review, Approved and Rejected match the Manage Bills tabs", () => {
  expect(isReviewBill({ status: "draft", due_date: null }, "2026-11-24")).toBe(true);
  expect(isApprovedBill({ status: "posted", due_date: null }, "2026-11-24")).toBe(true);
  expect(isRejectedBill({ status: "void", due_date: null })).toBe(true);
  expect(isReviewBill({ status: "posted", due_date: null }, "2026-11-24")).toBe(false);
  expect(isApprovedBill({ status: "paid", due_date: null }, "2026-11-24")).toBe(false);
});

test("Late counts overdue Review and Approved bills, not Rejected", () => {
  const today = "2026-11-18";
  expect(isLateBill({ status: "draft", due_date: "2026-11-17" }, today)).toBe(true);
  expect(isLateBill({ status: "posted", due_date: "2026-11-17" }, today)).toBe(true);
  expect(isLateBill({ status: "void", due_date: "2026-11-17" }, today)).toBe(false);
});

test("strict 1-bucket: overdue bills count only in Late", () => {
  const today = "2026-11-24";
  const lateApproved = { status: "posted", due_date: "2026-11-16" };
  const lateDraft = { status: "draft", due_date: "2026-11-23" };
  const currentApproved = { status: "posted", due_date: "2026-12-05" };
  expect(isApprovedBill(lateApproved, today)).toBe(false);
  expect(isLateBill(lateApproved, today)).toBe(true);
  expect(isReviewBill(lateDraft, today)).toBe(false);
  expect(isLateBill(lateDraft, today)).toBe(true);
  expect(isApprovedBill(currentApproved, today)).toBe(true);
  expect(isLateBill(currentApproved, today)).toBe(false);
});
