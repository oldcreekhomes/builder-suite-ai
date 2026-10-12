// @ts-ignore - bun's built-in test runner
import { expect, test } from "bun:test";
import { checkGroupTotal, groupCheckRows, splitCheckAmount } from "./multiCheckGroups";

test("two lot allocations remain one check and independent checks stay separate", () => {
  const rows = [
    { id: "a", splitGroupId: "split", amount: "625.00" },
    { id: "b", splitGroupId: "split", amount: "625.00" },
    { id: "c", splitGroupId: "", amount: "625.00" },
    { id: "d", splitGroupId: "", amount: "625.00" },
  ];
  const groups = groupCheckRows(rows);
  expect(groups.length).toBe(3);
  expect(groups[0].map(r => r.id)).toEqual(["a", "b"]);
  expect(checkGroupTotal(groups[0])).toBe(1250);
});

test("19 lot split and edited total preserve every cent with remainder on final lot", () => {
  const amounts = splitCheckAmount("7500", 19);
  expect(amounts.length).toBe(19);
  expect(amounts[0]).toBe("394.73");
  expect(amounts[18]).toBe("394.86");
  expect(checkGroupTotal(amounts.map(amount => ({ amount })))).toBe(7500);
  const edited = splitCheckAmount("7500.01", 19);
  expect(edited[18]).toBe("394.87");
  expect(checkGroupTotal(edited.map(amount => ({ amount })))).toBe(7500.01);
});

test("restoring a draft preserves unequal allocations without redistribution", () => {
  const rows: { splitGroupId: string; amount: string }[] = JSON.parse(JSON.stringify([
    { splitGroupId: "draft", amount: "10.01" },
    { splitGroupId: "draft", amount: "20.02" },
  ]));
  const groups = groupCheckRows(rows);
  expect(groups).toEqual([rows]);
  expect(checkGroupTotal(groups[0])).toBe(30.03);
});