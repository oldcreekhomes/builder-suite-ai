

## Copy Task Notes When Copying Schedule

### Problem
When copying a schedule from the TEMPLATE project to another project, the `notes` field is omitted from the task insert object, so all notes are lost.

### Fix: `src/hooks/useCopySchedule.ts`

Add `notes: task.notes` to the task object returned on ~line 74-87, alongside the other fields like `task_name`, `duration`, etc.

Single line addition -- no other files change.

