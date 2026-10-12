# Project rules

- Multiple-check entry renders explicit split groups through `multiCheckGroups` while preserving flat draft allocations and the existing save payload; this keeps compact display, draft restoration, and posting consistent.
- Saved multiple-check summaries read persisted detail lines and attachments with paginated UUID-batched queries and use the universal file preview; this exposes complete saved details without changing accounting or duplicating file handling.