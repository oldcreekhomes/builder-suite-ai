// @ts-ignore - bun's built-in test runner
import { expect, test } from "bun:test";
import { canRemoveCheckFile } from "./checkAttachmentStorage";

test("removing one attachment does not delete the PDF used by other checks", () => {
  expect(canRemoveCheckFile(5, false)).toBe(false);
});

test("the last attachment allows storage cleanup", () => {
  expect(canRemoveCheckFile(0, false)).toBe(true);
});

test("failed reference lookup never permits file deletion", () => {
  expect(canRemoveCheckFile(0, true)).toBe(false);
});