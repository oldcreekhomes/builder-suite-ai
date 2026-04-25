## Goal
While the AI is extracting line items, the Confirm PO dialog should show **only** an animated Sparkles icon + "Creating PO with AI…" — nothing else. Bump the minimum wait from 3s to 5s.

## Changes

### 1. `src/components/bidding/ConfirmPODialog.tsx`
- When `mode === 'send' && isExtracting` is true, **early-return a stripped-down DialogContent** that renders ONLY:
  - `DialogTitle` set to `"Confirm PO"` but visually hidden (`sr-only`) so the dialog stays accessible
  - A centered block (`min-h-[300px]`) with the animated Sparkles icon and "Creating PO with AI…" text
- Hide everything else: header row (Company / Bid Package Cost Code), line items table, custom message, Add Line button, Cancel/Send PO footer.
- **Animation**: combine `animate-pulse` with `animate-spin` (slow, e.g. `[animation:spin_3s_linear_infinite]`) on the Sparkles icon, plus an animated ellipsis on the text using a small CSS keyframe (e.g. `.thinking-dots::after { content: '…'; animation: dots 1.4s steps(4, end) infinite; }` defined inline via Tailwind arbitrary or a tiny `<style>` block) — or simply use `animate-pulse` on the text. Recommend: Sparkles with a soft pulsing scale + slow rotation, text with pulsing opacity.

### 2. `src/components/bidding/components/BiddingCompanyRow.tsx` and `src/components/bidding/BiddingTableRow.tsx`
- Change the minimum extraction-duration `setTimeout` from `3000` → `5000` ms in the `Promise.all` race in `handleOpenConfirmPO`.

## Result
- Clicking **Send PO** opens a clean, almost-empty dialog with just an animated Sparkles + "Creating PO with AI…" for at least 5 seconds.
- Once extraction completes (and 5s has elapsed), the full Confirm PO UI (company info, line item table, custom message, buttons) appears.