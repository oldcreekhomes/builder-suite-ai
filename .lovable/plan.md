## Plan: Live streaming voice-to-text (Claude-style)

Replace the current record-then-transcribe flow with live streaming transcription, where words appear in the message input as you speak.

### Behavior
- Tap mic → starts recording immediately; mic turns red/pulses.
- As you speak, partial transcripts stream into the message textarea in real time (appended to whatever is already typed).
- Tap mic again to stop. Final text remains in the box for you to edit and send.
- Browser permission denial / no-mic shows a clear toast; button hides on unsupported browsers.

### Technical approach
Lovable AI's `openai/gpt-4o-mini-transcribe` supports SSE streaming. We'll chunk audio with `MediaRecorder` (using `timeslice` ~1.5s) and send each chunk to the existing `voice-to-text` edge function with `stream: "true"`. The edge function pipes the SSE response straight back to the client; the hook parses `transcript.text.delta` events and appends each delta to the textarea live.

### Files to change
- **Edit `supabase/functions/voice-to-text/index.ts`** — add `stream=true` passthrough: forward the upstream SSE body to the client as `text/event-stream` instead of buffering the JSON response. Keep CORS and size limits.
- **Edit `src/hooks/useVoiceToText.ts`** — switch from one-shot upload to a streaming loop:
  - Start `MediaRecorder` with `timeslice` ~1500ms so chunks fire as you speak.
  - For each chunk, POST as `multipart/form-data` to the edge function URL (using `fetch` directly so we can stream the response — `supabase.functions.invoke` buffers).
  - Read the response body as an SSE stream, parse `transcript.text.delta` events, and emit each delta via an `onDelta(text)` callback.
  - Expose `{ status: 'idle'|'recording'|'transcribing', supported, toggle }`.
- **Edit `src/components/messages/VoiceInputButton.tsx`** — accept `onDelta` in addition to `onTranscript`; visual states unchanged (mic / pulsing red / spinner during final flush).
- **Edit `src/components/messages/SimpleMessageInput.tsx`** and **`src/components/messages/MessageInput.tsx`** — wire `onDelta` to append streamed text into the input value in real time.

### Out of scope
- Voice input on non-chat fields.
- Push-to-talk / hold-to-record.
- Speaker diarization or multi-language UI.

### Notes
- Uses existing `LOVABLE_API_KEY` and the already-deployed `voice-to-text` edge function — no new secrets, no DB/RLS changes.
- First-byte latency for the first chunk is typically ~300–700ms; subsequent words appear with sub-second lag.
