import { expect, test } from "bun:test";
import { sheetKey, nextVersionFor, disciplineFor } from "./drawingSheets";

test("same sheet number with different formatting is the same sheet", () => {
  expect(sheetKey("A-101")).toBe(sheetKey("a 101"));
  expect(sheetKey("A-101")).not.toBe(sheetKey("A-102"));
});

test("new sheet starts at version 1", () => {
  expect(nextVersionFor("A-101", new Map())).toBe(1);
});

test("re-uploading an existing sheet becomes the next version", () => {
  expect(nextVersionFor("A101", new Map([["A101", 2]]))).toBe(3);
});

test("the same sheet twice in one upload gets consecutive versions", () => {
  expect(nextVersionFor("A-101", new Map([["A101", 1]]), ["A-101"])).toBe(3);
});

test("discipline comes from the sheet letter", () => {
  expect(disciplineFor("S-201")).toBe("Structural");
});
