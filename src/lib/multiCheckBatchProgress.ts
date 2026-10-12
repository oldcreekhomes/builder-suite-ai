/** A retry resumes the original batch rather than posting its checks again. */
export interface BatchProgress<Row> {
  batchId: string;
  entries: { row: Row; checkId?: string; tagged: boolean; savedFiles: Set<number> }[];
}

export function newBatchProgress<Row>(batchId: string, rows: Row[]): BatchProgress<Row> {
  return { batchId, entries: rows.map(row => ({ row, tagged: false, savedFiles: new Set() })) };
}

export async function resumeCheckBatch<Row extends { files?: File[] }>(
  progress: BatchProgress<Row>,
  actions: {
    create: (row: Row) => Promise<string>;
    tag: (checkId: string, batchId: string) => Promise<void>;
    attach: (checkId: string, file: File) => Promise<void>;
  },
) {
  for (const entry of progress.entries) {
    if (!entry.checkId) entry.checkId = await actions.create(entry.row);
    if (!entry.tagged) {
      await actions.tag(entry.checkId, progress.batchId);
      entry.tagged = true;
    }
    for (const [index, file] of (entry.row.files || []).entries()) {
      if (entry.savedFiles.has(index)) continue;
      await actions.attach(entry.checkId, file);
      entry.savedFiles.add(index);
    }
  }
  return { batchId: progress.batchId, count: progress.entries.length };
}

export function enteredOrder<T extends { id: string; created_at: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}