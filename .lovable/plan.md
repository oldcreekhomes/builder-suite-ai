
## Remove Underlines from Folder and File Name Buttons

### What's Happening
In `src/components/files/SimpleFileList.tsx`, both the folder name button and the file name button have `hover:underline` in their className, which causes the underline to appear when the user hovers over a row.

### The Fix — One File, Two Lines

**`src/components/files/SimpleFileList.tsx`**

**Line 433 — Folder button:**
```
Before: className="flex items-center gap-2 text-left hover:underline focus:outline-none"
After:  className="flex items-center gap-2 text-left focus:outline-none"
```

**Line 474 — File button:**
```
Before: className="flex items-center gap-2 text-left hover:underline focus:outline-none truncate max-w-xs"
After:  className="flex items-center gap-2 text-left focus:outline-none truncate max-w-xs"
```

That's all — no logic changes, no other files touched.
