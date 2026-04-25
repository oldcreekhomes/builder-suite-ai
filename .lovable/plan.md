## Goal
1. Change the spinner text from "Creating PO with AI" to "Creating PO with machine learning" (the animated `...` will continue to append automatically via the existing CSS keyframe).
2. Verify / harden the 5-second minimum so the spinner is never shorter than 5 seconds, even when there are no proposals to extract from or when the AI returns instantly.

## Why it currently feels "very fast"
The dialog's `isExtracting` flag is controlled by the parent (`BiddingCompanyRow.tsx` / `BiddingTableRow.tsx`) using:

```ts
const [lines] = await Promise.all([
  extract(biddingCompany.proposals, costCodeId),
  new Promise((r) => setTimeout(r, 5000)),
]);
setExtractedLines(lines); // flips isExtracting -> false
```

So the spinner stays visible for **`max(actual AI time, 5000ms)`**. If `extract()` early-returns `null` instantly (e.g., no proposal files attached to the bidding company), the 5s floor *should* still hold — but if any code path skips the Promise.all wrapper, the dialog flashes by. We will audit both files and ensure the 5s timeout is always awaited.

## Changes

### 1. `src/components/bidding/ConfirmPODialog.tsx` (~line 217)
Change:
```tsx
<p className="po-ai-text text-sm font-medium text-muted-foreground">
  Creating PO with AI
</p>
```
to:
```tsx
<p className="po-ai-text text-sm font-medium text-muted-foreground">
  Creating PO with machine learning
</p>
```
The `.po-ai-text::after` keyframe appends an animated `...`, so the rendered output is **"Creating PO with machine learning..."** with cycling dots.

### 2. `src/components/bidding/components/BiddingCompanyRow.tsx` and `src/components/bidding/BiddingTableRow.tsx`
- Audit `handleOpenConfirmPO` in both files.
- Ensure the `Promise.all([extract(...), new Promise(r => setTimeout(r, 5000))])` pattern wraps **every** extraction path, including when `biddingCompany.proposals` is empty/null.
- Only call `setExtractedLines(...)` (which flips `isExtracting` to false in the dialog) **after** both promises resolve.

## Result
- Spinner reads **"Creating PO with machine learning..."** with the floating Sparkles icon and animated trailing dots.
- Spinner is visible for a guaranteed **minimum of 5 seconds** in every scenario — proposals present, no proposals, AI error, instant return — then transitions to the populated Confirm PO dialog (or empty editable table if no proposals existed).