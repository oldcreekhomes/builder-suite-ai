

# Fix Smart Gantt Scheduling Page to Match Template

## Overview
The Smart Gantt Scheduling page has several layout and styling differences from the Accounting and AI Bill Management pages. This plan aligns it exactly with those templates.

## Issues Identified

| Issue | Current (Wrong) | Should Be |
|-------|-----------------|-----------|
| Root container | `flex flex-col` | No flex classes |
| Hero background | `from-muted/50` | `from-muted` |
| Hero padding | `py-24 md:py-32` | `py-20 md:py-28` |
| Hero text spacing | `space-y-8` | `space-y-6` |
| Hero description | `text-lg` | `text-lg md:text-xl` |
| Hero button styling | `group` only | `text-lg px-8` |
| Hero button text | "Get Started" | "Sign Up" |
| Hero image wrapper | Single div with shadow-xl | Nested divs with shadow-2xl |
| Feature rows | Missing `expandableImage={true}` | Add `expandableImage={true}` to all |
| CTA section | Blue (`bg-primary`) with white text | Light gray gradient with dark text |

## File Changes

**`src/pages/features/GanttScheduling.tsx`**

1. **Line 24** - Change root container class:
   - From: `min-h-screen flex flex-col bg-background`
   - To: `min-h-screen w-full bg-background`

2. **Line 28** - Change hero section:
   - From: `w-full py-24 md:py-32 bg-gradient-to-b from-muted/50 to-background`
   - To: `py-20 md:py-28 bg-gradient-to-b from-muted to-background`

3. **Line 32** - Change text content spacing:
   - From: `space-y-8`
   - To: `space-y-6`

4. **Line 39** - Change description styling:
   - From: `text-lg text-muted-foreground max-w-lg`
   - To: `text-lg md:text-xl text-muted-foreground max-w-lg`

5. **Lines 42-49** - Change hero button:
   - From: `size="lg" className="group"` with "Get Started"
   - To: `size="lg" className="text-lg px-8"` with "Sign Up"

6. **Lines 52-59** - Change hero image wrapper structure:
   - From: Single `<div className="relative rounded-2xl overflow-hidden shadow-xl">`
   - To: Nested `<div className="relative"><div className="rounded-2xl overflow-hidden shadow-2xl">`

7. **Lines 65-75** - Add `expandableImage={true}` to Feature Row 1

8. **Lines 78-88** - Add `expandableImage={true}` to Feature Row 2

9. **Lines 91-101** - Add `expandableImage={true}` to Feature Row 3

10. **Lines 104-114** - Add `expandableImage={true}` to Feature Row 4

11. **Lines 117-135** - Replace entire CTA section:
    - From: Blue background with white text
    - To: Light gray gradient (`bg-gradient-to-b from-muted/30 to-background`) with dark text (`text-foreground`)

## Result
After these changes, the Smart Gantt Scheduling page will be pixel-perfect identical in layout and behavior to the Accounting and AI Bill Management pages, including:
- Correct alignment and spacing
- Expandable images that enlarge on click
- Matching CTA section styling

