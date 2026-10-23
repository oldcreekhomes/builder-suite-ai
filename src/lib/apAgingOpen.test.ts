// @ts-ignore
import { expect, test } from "bun:test";
import { isOpenForAging, toCents } from "./apAgingOpen";

test("a $0.01 open balance is listed", () => {
  expect(isOpenForAging(0.01)).toBe(true);
});

test("less than half a cent is not listed", () => {
  expect(isOpenForAging(0.004)).toBe(false);
});

test("totals round to cents", () => {
  expect(toCents(22987.72 + 0.01)).toBe(22987.73);
});
