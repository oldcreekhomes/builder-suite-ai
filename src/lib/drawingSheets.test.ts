// @ts-ignore
import { expect, test } from "bun:test";
import { cleanSheetNumber, sheetKey, nextVersionFor, disciplineFor } from "./drawingSheets";

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

test("page counts are stripped from sheet numbers", () => {
  expect(cleanSheetNumber("2 of 19")).toBe("2");
  expect(cleanSheetNumber("Sheet 3 of 19")).toBe("3");
  expect(cleanSheetNumber("2/19")).toBe("2");
  expect(cleanSheetNumber("SHEET 2")).toBe("2");
});

test("real sheet codes are kept", () => {
  expect(cleanSheetNumber("A-101")).toBe("A-101");
});

test("2 of 19 and 2 are the same sheet", () => {
  expect(sheetKey("2 of 19")).toBe(sheetKey("2"));
});
