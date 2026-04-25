Three small fixes to `src/components/CreatePurchaseOrderDialog.tsx`:

### 1. Make "Extra" checkbox black (default), not red
Line 576 currently forces destructive (red) styling. Remove the custom `className` so it uses the default shadcn checkbox (black border, black checked fill). Trash icon stays red per the previous request.

```tsx
// before
<Checkbox
  checked={line.extra}
  onCheckedChange={(checked) => updateLine(idx, { extra: checked as boolean })}
  className="border-destructive data-[state=checked]:bg-destructive ..."
/>
// after
<Checkbox
  checked={line.extra}
  onCheckedChange={(checked) => updateLine(idx, { extra: checked as boolean })}
/>
```

### 2. Align the heights of Custom Message / Attachments / Sending To
The three footer columns currently don't line up because:
- Custom Message Textarea uses `rows={4}` (~ ~112px+ tall)
- Attachments dropzone is `min-h-[80px]`
- Sending To box is `min-h-[80px]`

Standardize all three inner boxes to the same fixed height so their bottom edges line up exactly:
- Change Textarea from `rows={4}` to a fixed `h-[96px]` and keep `resize-none`.
- Change Attachments dropzone from `min-h-[80px]` to `h-[96px]`.
- Change Sending To box from `min-h-[80px]` to `h-[96px] overflow-auto`.

(96px is enough to comfortably show 2 recipient lines like "Taylor Doyle · tdoyle@…" without clipping; uploaded files / extra recipients render below the box as they do today.)

### 3. Pre-load bid proposals into the Attachments box
In the bid flow, the proposal PDF the company submitted is already on `bidContext.biddingCompany.proposals` (array of filenames in the `project-files/proposals/` public bucket — same URL pattern used in `usePOMutations.ts` line 88). Today the reset effect sets `setUploadedFiles([])` for the bid flow, so the box looks empty.

Update the bid branch of the open-effect (lines 106–118) to seed `uploadedFiles` from those proposals so they appear as removable chips under the dropzone, exactly like manually-uploaded files:

```tsx
if (bidContext) {
  setSelectedCompany({ ... });
  setNotes("");
  const proposals = bidContext.biddingCompany.proposals ?? [];
  setUploadedFiles(
    proposals.map((fileName) => ({
      id: `bid-${fileName}`,
      name: fileName,
      size: 0,
      url: `https://nlmnwlvmmkngrgatnzkj.supabase.co/storage/v1/object/public/project-files/proposals/${fileName}`,
    }))
  );
  setCustomMessage("");
  setLineItems(...);
}
```

No changes needed to the submit path — `createPOSendEmailAndUpdateStatus` already merges `biddingCompany.proposals` server-side (per `usePOMutations.ts` lines 83–88), so seeding them here is purely visual. If the user removes a chip, that just removes it from the locally-tracked `uploadedFiles` state, which is fine because the bid flow doesn't pass `uploadedFiles` into the mutation as the source of proposal attachments.

### Files touched
- `src/components/CreatePurchaseOrderDialog.tsx` (only)

### Not changing
- No DB / mutation / edge function changes
- No layout / column / button-label changes
- Trash icon stays red as previously requested
