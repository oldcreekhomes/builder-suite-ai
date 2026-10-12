# Project rules

- Multiple-check entry renders explicit split groups through `multiCheckGroups` while preserving flat draft allocations and the existing save payload; this keeps compact display, draft restoration, and posting consistent.
- Saved multiple-check summaries read persisted detail lines and attachments with paginated UUID-batched queries and use the universal file preview; this exposes complete saved details without changing accounting or duplicating file handling.
- Multiple-check batch retries resume retained per-check and per-file progress; this prevents reposting successful checks or silently discarding failed attachments.
- Check attachment removal deletes stored files only after a successful lookup confirms no remaining attachment references; this protects shared restored PDFs.