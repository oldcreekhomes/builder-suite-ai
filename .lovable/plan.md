

## Fix Stamp: Green Color + 2x Larger + Top of Page

### Changes
One file: `src/components/files/PDFViewer.tsx` (lines 303-320)

Move the stamp from `absolute bottom-5 right-5` to `absolute top-5 right-5` and:
- Change all red colors to green (`border-green-600`, `text-green-700`, `border-green-400`)
- Double the size: `px-8 py-6` padding, `text-2xl` for APPROVED, `text-base` for name, `text-sm` for date
- Keep the rotation and pointer-events-none behavior

