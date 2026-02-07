

# Fix AI Bill Management Page Images

## Overview
Update the AI Bill Management feature page to use bill-related images instead of the incorrect bid management image on the "Smart Assignment" row.

## Current Issue

| Row | Current Image | Problem |
|-----|---------------|---------|
| Hero | `ai-bill-management-preview.png` | Correct |
| Row 1 (Bulk Upload) | `ai-bill-management-preview.png` | Correct |
| Row 2 (AI Extraction) | `accounting-bills-preview.png` | Correct |
| Row 3 (Smart Assignment) | `bid-management-preview.png` | WRONG - shows bidding, not bills |
| Row 4 (Approval Workflow) | `document-management-preview.png` | Acceptable |

## Available Bill-Related Images
- `ai-bill-management-preview.png`
- `accounting-bills-preview.png`

## Solution
Since we have two bill-specific images, I will distribute them across the four feature rows to maximize variety while ensuring all rows show bill-related content:

| Row | New Image | Rationale |
|-----|-----------|-----------|
| Row 1 (Bulk Upload) | `ai-bill-management-preview.png` | Keep - shows upload interface |
| Row 2 (AI Extraction) | `accounting-bills-preview.png` | Keep - shows extracted data |
| Row 3 (Smart Assignment) | `accounting-bills-preview.png` | Change from bid-management - shows bill line items |
| Row 4 (Approval Workflow) | `ai-bill-management-preview.png` | Change from document-management - shows bills workflow |

## File Changes

**`src/pages/features/AIBillManagement.tsx`** (lines 123-148)

Change Row 3 (Smart Assignment):
- From: `imageSrc="/images/bid-management-preview.png"`
- To: `imageSrc="/images/accounting-bills-preview.png"`

Change Row 4 (Approval Workflow):
- From: `imageSrc="/images/document-management-preview.png"`
- To: `imageSrc="/images/ai-bill-management-preview.png"`

## Technical Details
This is a simple prop value change on two `FeatureRow` components. No structural changes needed.

