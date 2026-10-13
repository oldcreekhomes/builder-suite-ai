# Project rules

- Cash Position uses one shared component with explicit dashboard scope applied before search and totals; this keeps both dashboard instances synchronized without copying accounting logic.

- Dense dashboard tables opt into the shared `.table-compact` utility defined once in `src/index.css` instead of setting their own row heights or cell padding; this keeps compact row density consistent across dashboards with a single edit.

- Multiple-check entry renders explicit split groups through `multiCheckGroups` while preserving flat draft allocations and the existing save payload; this keeps compact display, draft restoration, and posting consistent.
- Saved multiple-check summaries read persisted detail lines and attachments with paginated UUID-batched queries and use the universal file preview; this exposes complete saved details without changing accounting or duplicating file handling.
- Multiple-check batch retries resume retained per-check and per-file progress; this prevents reposting successful checks or silently discarding failed attachments.
- Check attachment removal deletes stored files only after a successful lookup confirms no remaining attachment references; this protects shared restored PDFs.- Bank feeds go through the single `plaid` edge function; Plaid access tokens live only in `bank_connections` with the token column withheld from client grants, so they never reach the browser.
