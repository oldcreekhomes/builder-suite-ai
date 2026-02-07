

# Create Team Communication Feature Page

## Overview
Create the final feature page for "Team Communication" at `/features/team-communication` following the exact template structure established by the other five feature pages. The navigation already includes Team Communication in the Features dropdown, and a preview image already exists.

## Current State
- Route `/features/team-communication` is referenced in PublicHeader navigation but page doesn't exist
- Image available: `/images/team-communication-forecast-messages.png`
- Template established by: Accounting, AI Bill Management, Smart Gantt Scheduling, Bid Management, Document Management

## Page Structure

### Hero Section
- **Label**: "TEAM COMMUNICATION"
- **Headline**: "Keep Everyone in the Loop—Automatically"
- **Description**: Focus on eliminating the chaos of scattered texts, emails, and missed messages - all project communication in one place with automatic notifications

### Feature Rows (4 rows, alternating layout)

| Row | Label | Title | Description |
|-----|-------|-------|-------------|
| 1 | PROJECT-BASED MESSAGING | Conversations That Stay With the Job | Unlike group texts or email chains that get buried, BuilderSuite keeps every conversation tied to the project and task. Find any discussion instantly—even months later. |
| 2 | AUTOMATIC UPDATES | Everyone Knows What's Happening | When schedules change, bids come in, or tasks complete, the right people get notified automatically. No more "did you see my text?" or wondering if the message was received. |
| 3 | SUBCONTRACTOR PORTAL | Subs Stay Informed Without Extra Apps | Subcontractors receive updates via email and can respond directly—no apps to download, no accounts to create. They get exactly the information they need for their scope of work. |
| 4 | COMPLETE HISTORY | Never Lose a Conversation Again | Every message, decision, and update is logged and searchable. When disputes arise or questions come up, you have a complete record of who said what and when. |

### CTA Section
- Headline: "Ready to Simplify Project Communication?"
- Subtitle encouraging signup
- Light gray gradient background (matching other pages)

## File Changes

### New File: `src/pages/features/TeamCommunication.tsx`

Create following the exact structure of GanttScheduling.tsx:
- Same imports (useState, useNavigate, icons, components)
- PublicHeader with path modal handler
- Hero section with gradient from-muted to-background
- 4 FeatureRow components with `expandableImage={true}` and `showPathModal={true}`
- Alternating backgrounds: bg-muted/30 → bg-background → bg-muted/30 → bg-background
- CTA section with gray gradient (from-muted/30 to-background)
- PublicFooter
- Path selection modal (Home Builder vs Subcontractor)

### Update: `src/App.tsx`

1. Add import after line 40 (after FeatureDocumentManagement):
```tsx
import FeatureTeamCommunication from "./pages/features/TeamCommunication";
```

2. Add route after line 93 (after document-management route):
```tsx
<Route path="/features/team-communication" element={<FeatureTeamCommunication />} />
```

## Key Value Propositions to Highlight

1. **End Text/Email Chaos** - All communication in one searchable place
2. **Project-Tied Conversations** - Messages stay with the job, not lost in inboxes
3. **Automatic Notifications** - Right people informed at the right time
4. **No Extra Apps for Subs** - Email-based responses, zero friction
5. **Complete Audit Trail** - Full history for accountability and disputes

## Technical Details

### Image Usage
All feature rows will use the existing `/images/team-communication-forecast-messages.png` image.

### Component Structure
```tsx
// Same pattern as other feature pages
export default function TeamCommunication() {
  const [isPathModalOpen, setIsPathModalOpen] = useState(false);
  const navigate = useNavigate();

  // PublicHeader
  // Hero Section (gradient bg, label, headline, description, Sign Up button, image)
  // 4x FeatureRow (alternating bg-muted/30 and bg-background, alternating reversed)
  // CTA Section (gradient bg)
  // PublicFooter
  // Path Selection Modal (Home Builder / Subcontractor)
}
```

