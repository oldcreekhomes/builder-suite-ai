I understand the actual issue: after a bill moves out of Enter with AI / Review into Approved, the table cost-code cell is using different display logic and is listing one row per underlying split-lot bill line. For this invoice that means the same cost code appears 132 times. That is wrong. It should collapse the repeated cost code into one summarized display, just like Enter with AI / Review.

There are also still visual differences in the posted `EditBillDialog`: quantity/unit-cost inputs are disabled for approved/paid bills, and the shared shadcn `Input` disabled styling makes them gray/low-opacity. Enter with AI does not look that way, so the dialog still does not appear identical.

## Plan

### 1. Create one shared bill table display helper
Add a shared utility for bill-list cost-code/account summaries so Enter with AI, Review, Rejected, Approved, and Paid all use the same logic.

It will:
- group bill lines by visible cost code/account name, not by raw line count
- sum each group amount
- show one display label when all rows share the same cost code
- show `Primary Cost Code +N` only when there are genuinely multiple distinct cost codes/accounts
- preserve the tooltip breakdown with grouped totals, not 132 repeated entries
- keep fallbacks for missing values (`No Cost Code`, `No Account`)

### 2. Replace the duplicated table logic in all bill tabs
Update these components to use the shared helper:
- `BatchBillReviewTable.tsx` for Enter with AI upload/review queue
- `BillsApprovalTable.tsx` for Review, Rejected, and Paid
- `PayBillsTable.tsx` for Approved / ready-to-pay

This directly fixes the Approved tab shown in your screenshot so it will not list the same cost code over and over.

### 3. Make posted `EditBillDialog` visually match Enter with AI
Update `EditBillDialog.tsx` so approved/posted/paid read-only fields do not get the default disabled gray/opacity styling on the line-item table.

Specifically:
- Quantity and Unit Cost fields will use the same visual classes as Enter with AI
- read-only behavior will still be enforced, but without the gray/disabled appearance
- Total, Lot Cost, Address, Description, Cost Code, and Purchase Order table chrome will remain aligned with the Enter with AI dialog layout
- the bottom-right total/footer layout stays as previously requested

### 4. Preserve accounting safety
Do not merge the save paths or remove posted-bill protections.

Pending bills and posted bills can share the same UI and display math, but posted bills still need their existing accounting guards:
- approved/paid date and locked-period rules
- `updateApprovedBill` / correction behavior
- journal-entry and payment-allocation protections

## Technical details

Current mismatch:
```text
Enter with AI / Review table:
raw lines -> grouped by cost code/account -> one summarized cell

Approved table:
raw bill_lines -> one tooltip row per database line -> 132 repeated cost-code rows
```

Target behavior everywhere:
```text
raw lines -> normalize display name -> group by name -> sum amount -> render one consistent cell
```

The helper will be used by every bill-list table, so future changes to cost-code display happen in one place instead of three separate components.