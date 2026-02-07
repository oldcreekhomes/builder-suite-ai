

# Fix Team Communication Page Template

## Problem
The Team Communication page was created with slight template variations compared to the other feature pages, causing visual inconsistencies in:
- Hero section padding and spacing
- Label color styling
- Button sizing and styling
- CTA section layout

## Solution
Update `TeamCommunication.tsx` to match the exact structure of `DocumentManagement.tsx` and `GanttScheduling.tsx`, keeping all the Team Communication content intact.

## Changes Required

### File: `src/pages/features/TeamCommunication.tsx`

**1. Container class (line 20)**
- Change: `min-h-screen bg-background`
- To: `min-h-screen w-full bg-background`

**2. Hero section padding (line 24)**
- Change: `py-20 md:py-32`
- To: `py-20 md:py-28`

**3. Text content spacing (line 27)**
- Change: `space-y-8`
- To: `space-y-6`

**4. Label color (line 28)**
- Change: `text-muted-foreground`
- To: `text-primary`

**5. Description text size (line 34)**
- Change: `text-lg text-muted-foreground`
- To: `text-lg md:text-xl text-muted-foreground`

**6. Sign Up button styling (lines 37-44)**
- Change: `size="lg" className="group"`
- To: `size="lg" className="text-lg px-8"`
- Change arrow: `className="h-4 w-4 transition-transform group-hover:translate-x-1"`
- To: `className="ml-2 h-5 w-5"`

**7. Hero image styling (line 51)**
- Change: `className="w-full h-auto"`
- To: `className="w-full h-auto object-cover"`

**8. CTA section padding (line 115)**
- Change: `py-24 md:py-32`
- To: `py-20`

**9. CTA title margin (line 117)**
- Change: `mb-6`
- To: `mb-4`

**10. CTA description text size (line 120)**
- Change: `text-lg text-muted-foreground`
- To: `text-xl text-muted-foreground`

**11. CTA button styling (lines 123-130)**
- Change: `size="lg" className="group"`
- To: `size="lg" className="text-lg px-8 py-6"`
- Update button text: "Get Started Today" → "Get Started"
- Change arrow: `className="h-4 w-4 transition-transform group-hover:translate-x-1"`
- To: `className="ml-2 h-5 w-5"`

**12. Add handleGetStartedClick function**
Add the helper function used in other pages:
```tsx
const handleGetStartedClick = () => {
  setIsPathModalOpen(true);
};
```

## Content Preserved
All Team Communication specific content will remain unchanged:
- Hero headline: "Keep Everyone in the Loop—Automatically"
- Hero description about eliminating scattered texts and emails
- All 4 feature rows with their labels, titles, and descriptions
- CTA headline: "Ready to Simplify Project Communication?"
- Image references to `/images/team-communication-forecast-messages.png`

