

# AI Bill Management Feature Page

## Overview
Create a new feature page for "AI Bill Management" at `/features/ai-bill-management` using the Accounting page as a template. This page will highlight the value of automated PDF upload, AI data extraction, and eliminating manual data entry costs.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/pages/features/AIBillManagement.tsx` | Create | New feature page using Accounting template |
| `src/App.tsx` | Modify | Add route for `/features/ai-bill-management` |

## Page Structure

The page will follow the exact same structure as Accounting.tsx:

```text
+------------------------------------------+
|         PublicHeader (shared)            |
+------------------------------------------+
|                                          |
|    HERO SECTION                          |
|    "AI BILL MANAGEMENT"                  |
|    "Stop Paying for Manual Data Entry"   |
|    + Hero image                          |
+------------------------------------------+
|                                          |
|    FEATURE ROW 1 (bg-muted/30)           |
|    "Bulk PDF Upload"                     |
+------------------------------------------+
|                                          |
|    FEATURE ROW 2 (bg-background)         |
|    "Intelligent Data Extraction"         |
+------------------------------------------+
|                                          |
|    FEATURE ROW 3 (bg-muted/30)           |
|    "Smart Cost Code Assignment"          |
+------------------------------------------+
|                                          |
|    FEATURE ROW 4 (bg-background)         |
|    "Approval Workflow"                   |
+------------------------------------------+
|                                          |
|    CTA SECTION                           |
|    "Ready to Automate Your Bills?"       |
+------------------------------------------+
|         PublicFooter (shared)            |
+------------------------------------------+
```

## Content Details

### Hero Section
- **Label**: "AI BILL MANAGEMENT"
- **Title**: "Stop Paying for Manual Data Entry"
- **Description**: "Upload hundreds of vendor invoices at once and let AI do the work. Extract amounts, dates, vendor info, and line items automatically—saving hours of tedious data entry and reducing costly errors."
- **Image**: `/images/ai-bill-management-preview.png`

### Feature Row 1 - Bulk PDF Upload (Image Left)
- **Label**: "BULK UPLOAD"
- **Title**: "Upload Hundreds of Bills in Seconds"
- **Description**: "Drag and drop entire folders of vendor invoices, receipts, and statements. Whether it's 5 bills or 500, BuilderSuite processes them all simultaneously. No more scanning one page at a time or waiting for slow uploads."

### Feature Row 2 - Intelligent Data Extraction (Image Right, reversed)
- **Label**: "AI EXTRACTION"
- **Title**: "Intelligent Data Extraction That Actually Works"
- **Description**: "Our AI reads each document and extracts vendor name, invoice number, date, due date, line items, and totals with remarkable accuracy. It learns your vendor patterns over time, getting smarter with every bill you process."

### Feature Row 3 - Smart Cost Code Assignment (Image Left)
- **Label**: "SMART ASSIGNMENT"
- **Title**: "Automatic Cost Code Suggestions"
- **Description**: "Stop looking up cost codes for every line item. BuilderSuite remembers which cost codes you typically use for each vendor and suggests them automatically. One click to confirm, and you're done."

### Feature Row 4 - Approval Workflow (Image Right, reversed)
- **Label**: "APPROVAL WORKFLOW"
- **Title**: "Route Bills for Approval Automatically"
- **Description**: "Set up approval rules based on amount, vendor, or project. Bills get routed to the right people automatically, with email notifications and one-click approval. No more chasing signatures or losing invoices in email."

### CTA Section
- **Title**: "Ready to Automate Your Bill Entry?"
- **Description**: "Join builders who have cut their bookkeeping time by 80% and eliminated data entry errors for good."

## Technical Details

The new page will:
1. Import the same components as Accounting.tsx (PublicHeader, PublicFooter, FeatureRow, Dialog, etc.)
2. Use the same path selection modal for "Get Started" and "Sign Up" buttons
3. Follow the same alternating pattern for feature rows (reversed prop, bg-muted/30 vs bg-background)
4. Reuse existing images from `/public/images/`

