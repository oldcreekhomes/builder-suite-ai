

## Current Section Backgrounds (top to bottom)

| # | Section | Current Background | Issue |
|---|---------|-------------------|-------|
| 1 | Hero | `bg-gradient-to-b from-muted to-background` | Gradient — not solid |
| 2 | Growth Timeline | `bg-background` | White |
| 3 | Vision | `bg-gradient-to-br from-primary/5 to-primary/10` | Gradient — not solid |
| 4 | Our Story | `bg-muted/30` | Gray (partial opacity) |
| 5 | BuilderSuite Difference | `bg-background` | White |
| 6 | Our Philosophy | `bg-muted/30` | Gray (partial opacity) |
| 7 | Why We're Different | `bg-background` | White |
| 8 | CTA | `bg-gradient-to-b from-background to-muted` | Gradient — not solid |

Three sections use gradients, breaking the alternating pattern.

## Plan

Replace all backgrounds with strict alternating **white** (`bg-background`) and **gray** (`bg-muted`) pattern:

| # | Section | New Background |
|---|---------|---------------|
| 1 | Hero | `bg-muted` (gray) |
| 2 | Growth Timeline | `bg-background` (white) |
| 3 | Vision | `bg-muted` (gray) |
| 4 | Our Story | `bg-background` (white) |
| 5 | BuilderSuite Difference | `bg-muted` (gray) |
| 6 | Our Philosophy | `bg-background` (white) |
| 7 | Why We're Different | `bg-muted` (gray) |
| 8 | CTA | `bg-background` (white) |

**One file changed**: `src/pages/AboutUs.tsx` — 8 class name updates on the `<section>` elements.

