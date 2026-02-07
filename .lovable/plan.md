

# Create Bid Management Feature Page

## Overview
Create a new feature page for "Bid Management" at `/features/bid-management` following the exact same template structure as Smart Gantt Scheduling, AI Bill Management, and Accounting pages.

## Page Structure (Matching Existing Template)

### Hero Section
- **Small Label**: "BID MANAGEMENT"
- **Large Headline**: "Automated Bid Collection"
- **Description**: Focus on the core value - eliminating manual bid chasing and automating subcontractor communication

### Feature Rows (4 rows alternating layout)

| Row | Label | Title | Key Message |
|-----|-------|-------|-------------|
| 1 | NO LOGIN REQUIRED | Subs Bid Without Creating Accounts | Subcontractors receive an email link to view specs and submit their bid - no passwords, no apps, no barriers |
| 2 | AUTOMATIC REMINDERS | Never Chase a Late Bid Again | Set reminder dates and BuilderSuite automatically emails subs who haven't responded - escalating frequency until you get a response |
| 3 | SIDE-BY-SIDE COMPARISON | Compare Bids Instantly | All bids display in one view with pricing, included items, and attachments - making award decisions fast and informed |
| 4 | CENTRALIZED COMMUNICATION | Every Conversation in One Place | Questions, clarifications, and bid revisions all tracked in one thread per bid package - nothing lost in email |

### CTA Section
- Headline: "Ready to Streamline Your Bid Process?"
- Subtitle encouraging signup
- Same styling as other pages (gray gradient background)

## File Changes

### New File: `src/pages/features/BidManagement.tsx`
Create new file following the exact structure of GanttScheduling.tsx:
- Same imports (useState, useNavigate, components, icons)
- Same component structure with path modal
- Hero section with proper spacing and styling
- 4 FeatureRow components with `expandableImage={true}` and `showPathModal={true}`
- CTA section with gray gradient
- Footer and path selection modal

### Update: `src/App.tsx`
Add two changes:
1. **Line ~39**: Add import for the new page:
   ```tsx
   import FeatureBidManagement from "./pages/features/BidManagement";
   ```

2. **Line ~89**: Add route definition:
   ```tsx
   <Route path="/features/bid-management" element={<FeatureBidManagement />} />
   ```

## Key Differentiators to Highlight

The content emphasizes what makes BuilderSuite's bid management superior:

1. **Zero Friction for Subs** - No accounts, no apps, just click and bid
2. **Automated Follow-ups** - System does the chasing, not project managers
3. **Smart Reminders** - Set it and forget it until bids come in
4. **Organized Comparison** - No more spreadsheets to compare quotes
5. **Audit Trail** - Every interaction documented automatically

## Image Usage
All feature rows will use `/images/bid-management-preview.png` which already exists in the public folder.

