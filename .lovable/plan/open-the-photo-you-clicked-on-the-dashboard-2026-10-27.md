# Open the photo you clicked on the dashboard

## What's wrong
On the project dashboard, clicking anywhere in the Project Photos card always opens the first photo. The individual thumbnails don't know which one was clicked.

## Change
- Clicking a thumbnail opens that exact photo (e.g. the 8th, the fence). Next/previous arrows still move through all photos from there.
- Clicking elsewhere on the card (title, empty space) still opens the first photo, same as today.

## Technical details
- `src/pages/ProjectDashboard.tsx`: add `onClick={(e) => { e.stopPropagation(); setSelectedPhoto(photo); setShowPhotoViewer(true); }}` and `cursor-pointer` on each thumbnail wrapper.
