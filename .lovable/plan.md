## Add a "talk to type" mic button to the chat composer

Add a microphone button to the left of the message text field in both chat surfaces (the floating chat popup shown in your screenshot, and the full Messages page). Tap it to record, tap again to stop. The spoken words are transcribed and dropped into the message box, where you can edit and then hit Send like normal.

### Behavior
- **Tap mic** → starts recording (mic icon turns red/pulses, "Listening…" hint shown).
- **Tap mic again** (or auto-stop after silence) → stops recording, shows a small "Transcribing…" spinner.
- **Transcript appears** in the message input. You can edit it, add more, attach files, then send.
- If the browser denies microphone permission, show a clear toast explaining how to enable it.
- Hidden gracefully on browsers/devices without microphone support.

### How transcription works (technical)
- Audio captured in the browser via `MediaRecorder` (webm/mp4 depending on browser).
- Sent to a new Supabase Edge Function `voice-to-text` that calls Lovable AI's speech-to-text endpoint (`openai/gpt-4o-mini-transcribe`) — no extra API keys needed, billed from existing Lovable AI credits.
- Function returns the transcript; client inserts it into the input.

### Files
- New: `supabase/functions/voice-to-text/index.ts` — receives audio, forwards to Lovable AI STT, returns text.
- New: `src/hooks/useVoiceToText.ts` — handles MediaRecorder lifecycle, permission, upload, loading state.
- New: `src/components/messages/VoiceInputButton.tsx` — the mic button UI (icon, recording state, tooltip).
- Edit: `src/components/messages/SimpleMessageInput.tsx` — add the button to the left of the textarea, append transcript to input value.
- Edit: `src/components/messages/MessageInput.tsx` — same addition for the full Messages page.

### Out of scope (can add later if you want)
- Live word-by-word streaming transcription.
- Voice input on non-chat fields (notes, descriptions, etc.).
- Push-to-talk / hold-to-record.
