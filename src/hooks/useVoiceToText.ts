import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Status = "idle" | "recording" | "transcribing";

// Roll the MediaRecorder every CHUNK_MS so each segment is a complete,
// independently decodable audio file we can transcribe and append live.
const CHUNK_MS = 3000;

export function useVoiceToText(onTranscript: (text: string) => void) {
  const [status, setStatus] = useState<Status>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rotateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef(0);
  const stoppingRef = useRef(false);
  const mimeTypeRef = useRef<string>("");

  const supported =
    typeof window !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window.MediaRecorder !== "undefined";

  const transcribeBlob = useCallback(
    async (blob: Blob) => {
      if (blob.size < 1024) return;
      pendingRef.current += 1;
      setStatus((s) => (s === "idle" ? "transcribing" : s));
      try {
        const form = new FormData();
        const ext = (blob.type.split(";")[0].split("/")[1] || "webm").replace("x-", "");
        form.append("file", blob, `chunk.${ext}`);
        const { data, error } = await supabase.functions.invoke("voice-to-text", {
          body: form,
        });
        if (error) throw error;
        const text = (data as { text?: string } | null)?.text?.trim();
        if (text) onTranscript(text);
      } catch (err) {
        console.error("Transcription error:", err);
        toast.error("Couldn't transcribe a segment.");
      } finally {
        pendingRef.current -= 1;
        if (pendingRef.current <= 0 && !recorderRef.current) {
          setStatus("idle");
        }
      }
    },
    [onTranscript],
  );

  const startRecorder = useCallback(
    (stream: MediaStream) => {
      const recorder = mimeTypeRef.current
        ? new MediaRecorder(stream, { mimeType: mimeTypeRef.current })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        void transcribeBlob(blob);

        // If we're just rotating (not fully stopping), kick off the next recorder.
        if (!stoppingRef.current && streamRef.current) {
          startRecorder(streamRef.current);
        } else if (stoppingRef.current) {
          recorderRef.current = null;
          streamRef.current?.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          if (pendingRef.current <= 0) setStatus("idle");
        }
      };

      recorder.start();

      // Schedule rotation
      rotateTimerRef.current = setTimeout(() => {
        if (recorderRef.current === recorder && recorder.state !== "inactive") {
          recorder.stop();
        }
      }, CHUNK_MS);
    },
    [transcribeBlob],
  );

  const stop = useCallback(() => {
    if (!recorderRef.current) return;
    stoppingRef.current = true;
    if (rotateTimerRef.current) {
      clearTimeout(rotateTimerRef.current);
      rotateTimerRef.current = null;
    }
    if (recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }, []);

  const start = useCallback(async () => {
    if (!supported) {
      toast.error("Voice input isn't supported in this browser");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      stoppingRef.current = false;
      pendingRef.current = 0;
      mimeTypeRef.current =
        ["audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";

      setStatus("recording");
      startRecorder(stream);
    } catch (err) {
      console.error("Mic error:", err);
      toast.error("Microphone access denied. Enable it in your browser settings.");
      setStatus("idle");
    }
  }, [supported, startRecorder]);

  const toggle = useCallback(() => {
    if (status === "recording") stop();
    else if (status === "idle") start();
  }, [status, start, stop]);

  return { status, supported, toggle };
}
