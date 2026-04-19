
User reports: labels (Main Level, Second Level, etc.) extracted correctly, but only Covered Porch (96 sq ft) got the right SF. All other numbers were wrong despite being clearly labeled.

This is a model accuracy / OCR problem. Let me think about why.

## Likely root causes

1. **Image resolution is too low.** In `UploadSheetDialog`, pages are rendered at 2× zoom and converted to PNG. Then for the profile-extraction pass, we likely send those same images to Gemini. Small numerals like "1154" vs "1154 sq ft" inside a thin-line architectural table can be read incorrectly when the page is downsampled. Need to confirm what resolution we're sending.

2. **We're sending only thumbnails or compressed JPEGs.** Need to check the edge function — if it pulls a downsized signed URL, accuracy collapses on small text.

3. **Model is hallucinating/guessing instead of reading.** Gemini Flash sometimes interpolates numbers that "look reasonable" instead of OCR'ing precisely. Pro tier (gemini-2.5-pro) is dramatically better at small-text OCR in tables.

4. **No verification step.** We accept whatever the model returns. The Stack Overflow hint is exactly right: validate extraction against source. For numbers in a table, a second cheap pass ("re-read these specific cells") catches most errors.

5. **Locale formatting / thousands separators.** "1,154" vs "1154" — if model returns "1.154" (european) or strips a digit, we'd see garbage. Need explicit "raw integer, no separators" instruction.

6. **Single-pass over many pages.** When we send all sheets at once, the model averages attention across pages and misses the schedule. The Area Schedule lives on ONE specific sheet (cover/title sheet usually). Need to either send pages one at a time for this extraction, or explicitly find-then-read.

Let me confirm assumption #1 by reading the edge function and the upload dialog.
