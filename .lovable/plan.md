

# Swap Feature Row Content

## Overview
Swap the content between the first feature row (General Ledger) and the second feature row (AI-Powered Bill Entry) while keeping the layout structure, colors, and `reversed` prop settings exactly the same.

## Current State (lines 96-121)

**Row 1** (bg-muted/30, image left):
- Label: "GENERAL LEDGER"
- Title: "Built-In Double-Entry Accounting"
- Description: About double-entry accounting, debits/credits, balance sheets
- Image: `/images/accounting-bills-preview.png`

**Row 2** (bg-background, image right/reversed):
- Label: "AI-POWERED BILL ENTRY"
- Title: "Scan and Extract Bill Data Automatically"
- Description: About AI extracting bill data, vendor info, line items
- Image: `/images/ai-bill-management-preview.png`

## After Swap

**Row 1** (bg-muted/30, image left) - now with AI Bill Entry content:
- Label: "AI-POWERED BILL ENTRY"
- Title: "Scan and Extract Bill Data Automatically"
- Description: About AI extracting bill data, vendor info, line items
- Image: `/images/ai-bill-management-preview.png`
- ImageAlt: "AI-Powered Bill Management"

**Row 2** (bg-background, image right/reversed) - now with General Ledger content:
- Label: "GENERAL LEDGER"
- Title: "Built-In Double-Entry Accounting"
- Description: About double-entry accounting, debits/credits, balance sheets
- Image: `/images/accounting-bills-preview.png`
- ImageAlt: "BuilderSuite General Ledger"

## Technical Details

Only `src/pages/features/Accounting.tsx` needs to be modified. The change involves swapping:
- `label` prop values
- `title` prop values
- `description` prop values
- `imageSrc` prop values
- `imageAlt` prop values

All other props (`buttonText`, `buttonLink`, `className`, `reversed`, `expandableImage`, `showPathModal`) remain exactly as they are.

