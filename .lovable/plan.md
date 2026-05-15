# Fast PDF Preview — Stream Pages Instead of Pre-Downloading

## The actual bottleneck

The PDF viewer (`PDFViewer.tsx`) is already smart — it virtualizes pages and only renders what's on screen. The slowness happens **before** it ever runs.

In `src/components/files/hooks/useFilePreview.ts` (lines 47–76), every PDF goes through this path:

```
supabase.storage.from(bucket).download(path)   // waits for ALL 23.86 MB
  → new Blob(..., { type: 'application/pdf' })
  → URL.createObjectURL(blob)
  → hand blob: URL to <Document file={...} />
```

So the user stares at a spinner for 10+ seconds while the entire file streams to the browser. Only *then* does react-pdf parse it and render page 1. Page virtualization is useless here because the whole file is already in memory.

PDF.js (which `react-pdf` wraps) is designed to do the opposite: fetch the trailer + xref table first (a few KB), then pull individual page objects via HTTP **Range** requests as they're needed. Supabase Storage signed URLs support `Range` natively. We just have to stop pre-downloading.

## Plan

### 1. Stop blob-downloading PDFs in `useFilePreview.ts`

Remove the PDF-specific `supabase.storage.download()` branch (lines 40–76). Let PDFs fall through to the existing signed-URL path (lines 86–102) like every other file type. The signed URL goes straight to `<Document file={signedUrl} />`, and PDF.js handles streaming.

The "download as blob to avoid Chrome blocking" comment refers to inline-rendering PDFs in `<iframe>`/`<embed>`, which we don't do here — we render with react-pdf's canvas. So the blob workaround isn't needed.

### 2. Hint PDF.js to use range requests + a worker-side cache

In `PDFViewer.tsx`, change the `<Document file={fileUrl}>` prop to an options object so we can pass PDF.js loader hints:

```tsx
<Document
  file={{
    url: fileUrl,
    withCredentials: false,
    // Force range mode + reasonable chunk size
    rangeChunkSize: 65536,         // 64 KB chunks
    disableStream: false,
    disableAutoFetch: true,        // critical: don't greedily fetch the whole file
  }}
  ...
/>
```

`disableAutoFetch: true` is the key flag — without it, PDF.js downloads the whole file in the background even when range requests are enabled, which defeats the purpose. With it, only the bytes for visible pages are fetched.

### 3. Keep blob fallback only for download button

The "Download" action (`handleDownload`, line 146+) already re-downloads via `supabase.storage.download()` when the user clicks Download. That's correct and stays as is.

### 4. Verify Supabase signed URLs honor Range

Supabase Storage proxies through a CDN that supports `Range: bytes=…` and returns `206 Partial Content`. No backend change needed. We'll verify in the Network tab after the change: opening the 23 MB plan should show several small `206` responses instead of one ~24 MB `200`.

## Files to change

- `src/components/files/hooks/useFilePreview.ts` — drop PDF blob-download branch
- `src/components/files/PDFViewer.tsx` — pass `{ url, disableAutoFetch, rangeChunkSize }` instead of bare URL string

No backend, RLS, or storage changes required.

## Expected result

- Time to first page rendered for a 24 MB PDF: **~10s → ~1s**
- Network: ~150–300 KB to render page 1 instead of 23.86 MB
- Scrolling further pages triggers small range fetches on demand
- Users stop downloading to desktop because the in-app viewer is finally fast

## Out of scope (mention only if user wants it later)

- Pre-generating thumbnail images of page 1 server-side (overkill once range streaming works)
- Switching to a third-party PDF service like iLovePDF (unnecessary — PDF.js + range requests solves it for free)
