# Drawings: "machine learning" message while sheets are read

## What changes
- While your drawings are being prepared and read, the Drawings page shows the same box as the bill upload: the floating sparkle icon and animated dots, with the message **"Reading 19 sheets from machine learning"** and a smaller line under it, **"Finding sheet numbers and titles · 7 of 19"**.
- This box replaces the plain "Preparing 7 of 19..." text in the drop area and at the top of the review screen.
- When every sheet has been read, the message goes away and you're left with the review list to check and save, as now.
- Each page still waiting to be read shows a small sparkle and "Reading..." in its Sheet # and Title boxes, instead of a blank box.

## Technical details
- Pull the bill message (sparkle icon, float and dots animation, styles) out of `BillsApprovalTabs.tsx` into a shared `src/components/ui/ml-processing-message.tsx` (`<MlProcessingMessage text=... detail=... />`). Use it in both places, so bills look exactly the same as now.
- `ProjectDrawings.tsx`: show it while `preparing` or while any page is still being read; the count comes from total pages and pages done.
