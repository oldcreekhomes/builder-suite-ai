

## Rework Purchase Orders to Support Multi-Line Items

### Overview
Currently, each Purchase Order is a single line (one cost code, one amount). The vendor bid for Oceanwatch Court shows 20+ line items across framing and siding. We need POs to support multiple line items -- similar to how bills have `bill_lines` -- so each section of a bid can be tracked individually and matched against incoming invoices.

### Database Changes

**New table: `purchase_order_lines`**
- `id` (uuid, primary key)
- `purchase_order_id` (uuid, FK to `project_purchase_orders`)
- `cost_code_id` (uuid, FK to `cost_codes`)
- `description` (text) -- e.g. "Ground floor", "First floor", "Windows install -19-"
- `quantity` (numeric, default 1)
- `unit_cost` (numeric)
- `amount` (numeric) -- quantity x unit_cost
- `line_number` (integer)
- `extra` (boolean, default false)
- `created_at` / `updated_at` (timestamptz)

**Modify `project_purchase_orders`**
- `cost_code_id` becomes nullable (PO header no longer needs a single cost code; lines carry them)
- `total_amount` will be computed from lines (sum of line amounts) on save
- `extra` stays on the header as a default but can be overridden per line
- Keep backward compatibility: existing single-line POs will be migrated into a single `purchase_order_lines` row

**Migration for existing data**
- For every existing PO, insert one row into `purchase_order_lines` using the PO's current `cost_code_id`, `total_amount`, and `extra` values
- Enable RLS on `purchase_order_lines` matching existing PO policies

### UI Changes

**Reworked Create/Edit Purchase Order Dialog**
- **Header section** (compact): Company selector, Notes, Custom Message, Attachments -- kept but made more compact
- **Line items grid** (new, bill-style):
  - Columns: Cost Code | Description | Qty | Unit Cost | Amount | Extra | Remove
  - "Add Line" button at the bottom
  - Auto-calculate Amount = Qty x Unit Cost
  - Subtotal row at the bottom summing all line amounts
- Remove the single Cost Code and Amount fields from the header
- Remove the single Extra radio from the header (moved per-line)
- Dialog width stays at `max-w-2xl` but the form becomes more compact and tabular

**PO Table changes**
- The main PO table row shows: PO Number, Primary Cost Code (first line or "Multiple"), Company, Total Amount, Notes, Files, Actions
- The `PurchaseOrdersTableHeader` updates accordingly

**PO Details Dialog updates**
- Show line items breakdown within the details dialog
- Each line shows: Description, Cost Code, Qty, Unit Cost, Amount
- Bills matched section can now match at the line level (bill_lines.purchase_order_id already exists -- we can later add `purchase_order_line_id` to `bill_lines` for granular matching, but that's a follow-up)

**Email (send-po-email) updates**
- The email body should list line items instead of a single cost code and amount
- Shows a table of lines with descriptions, quantities, and amounts, plus a total

### Technical Details

**Files to create:**
- SQL migration for `purchase_order_lines` table + data migration
- `src/hooks/usePurchaseOrderLines.ts` -- hook for CRUD on PO lines

**Files to modify:**
- `src/components/CreatePurchaseOrderDialog.tsx` -- major rework to multi-line form
- `src/components/purchaseOrders/PurchaseOrdersTableHeader.tsx` -- update columns
- `src/components/purchaseOrders/PurchaseOrdersTableRow.tsx` -- show "Multiple" or first cost code
- `src/components/bills/PODetailsDialog.tsx` -- show line items breakdown
- `src/hooks/usePurchaseOrders.ts` -- fetch lines with POs, update total_amount computation
- `supabase/functions/send-po-email/index.ts` -- line items in email body

### Backward Compatibility
- Existing POs are migrated to have one line each, so nothing breaks
- The `cost_code_id` on the PO header is kept for grouping/display but derived from the first/primary line
- Bill matching via `bill_lines.purchase_order_id` continues to work at the PO level; line-level matching is a future enhancement

