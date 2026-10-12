// @ts-ignore - bun's built-in test runner
import { expect, test } from "bun:test";
import { enteredOrder, newBatchProgress, resumeCheckBatch } from "./multiCheckBatchProgress";
import { groupCheckRows } from "./multiCheckGroups";

test("summary restores entry order rather than newest-check-first", () => {
  const rows = [
    { id: "potomac-156", created_at: "2026-10-12T19:30:22", amount: 156.89 },
    { id: "potomac-7200", created_at: "2026-10-12T19:30:21", amount: 7200 },
    { id: "413-nelson", created_at: "2026-10-12T19:30:16", amount: 1250 },
  ];
  expect(enteredOrder(rows).map(r => r.id)).toEqual(["413-nelson", "potomac-7200", "potomac-156"]);
});

test("each independent or split check keeps all its files", async () => {
  const first = new File(["a"], "a.pdf");
  const second = new File(["b"], "b.pdf");
  const third = new File(["c"], "c.pdf");
  const groups = groupCheckRows([
    { splitGroupId: "lots", files: [first, second] },
    { splitGroupId: "lots", files: [] as File[] },
    { splitGroupId: "", files: [third] },
  ]);
  const progress = newBatchProgress("batch", groups.map(group => ({ files: group.flatMap(r => r.files) })));
  const attachments: string[] = [];
  let count = 0;
  await resumeCheckBatch(progress, {
    create: async () => `check-${++count}`,
    tag: async () => {},
    attach: async (id, file) => { attachments.push(`${id}:${file.name}`); },
  });
  expect(attachments).toEqual(["check-1:a.pdf", "check-1:b.pdf", "check-2:c.pdf"]);
});

test("failed file save retries without duplicate checks or already saved files", async () => {
  const progress = newBatchProgress("batch", [{ files: [new File(["a"], "a.pdf"), new File(["b"], "b.pdf")] }]);
  let creates = 0;
  let fail = true;
  const files: string[] = [];
  const actions = {
    create: async () => { creates++; return "check-1"; },
    tag: async () => {},
    attach: async (_id: string, file: File) => {
      if (file.name === "b.pdf" && fail) throw new Error("attachment record failed");
      files.push(file.name);
    },
  };
  await expect(resumeCheckBatch(progress, actions)).rejects.toThrow("attachment record failed");
  expect(progress.entries[0].savedFiles.has(1)).toBe(false);
  fail = false;
  await resumeCheckBatch(progress, actions);
  expect(creates).toBe(1);
  expect(files).toEqual(["a.pdf", "b.pdf"]);
});