import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Status = "idle" | "recording" | "transcribing";

// How often to re-transcribe the cumulative audio while recording.
const TICK_MS = 2500;

interface Options {
  onStart?: () => void;
  onLiveText: (fullText: string) => void;
}

export function useVoiceToText({ onStart, onLiveText }: Options) {
  const [status, setStatus] = useState<Status>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const busyRef = useRef(false);
  const queuedRef = useRef(false);
  const stoppingRef = useRef(false);
  const mimeRef = useRef<string>("");

  const supported =
    typeof window !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window.MediaRecorder !== "undefined";

  const transcribeCumulative = useCallback(async () => {
    if (busyRef.current) {
      queuedRef.current = true;
      return;
    }
    if (chunksRef.current.length === 0) return;
    busyRef.current = true;
    try {
      const type = mimeRef.current || "audio/webm";
      const blob = new Blob(chunksRef.current, { type });
      if (blob.size < 2048) return;

      const form = new FormData();
      const ext = (type.split(";")[0].split("/")[1] || "webm").replace("x-", "");
      form.append("file", blob, `recording.${ext}`);
      const { data, error } = await supabase.functions.invoke("voice-to-text", {
        body: form,
      });
      if (error) throw error;
      const text = (data as { text?: string } | null)?.text?.trim();
      if (text) onLiveText(text);
    } catch (err) {
      console.error("Transcription error:", err);
    } finally {
      busyRef.current = false;
      if (queuedRef.current) {
        queuedRef.current = false;
        void transcribeCumulative();
      } else if (stoppingRef.current) {
        setStatus("idle");
      }
    }
  }, [onLiveText]);

  const stop = useCallback(() => {
    if (!recorderRef.current) return;
    stoppingRef.current = true;
    if (tickTimerRef.current) {
      clearInterval(tickTimerRef.current);
      tickTimerRef.current = null;
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
      busyRef.current = false;
      queuedRef.current = false;
      chunksRef.current = [];

      const mimeType =
        ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((t) =>
          MediaRecorder.isTypeSupported(t),
        ) ?? "";
      mimeRef.current = mimeType || "audio/webm";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setStatus("transcribing");
        // Final flush
        void transcribeCumulative();
      };

      // Emit a chunk every TICK_MS so cumulative blob grows incrementally.
      recorder.start(TICK_MS);
      onStart?.();
      setStatus("recording");

      tickTimerRef.current = setInterval(() => {
        if (!stoppingRef.current) void transcribeCumulative();
      }, TICK_MS);
    } catch (err) {
      console.error("Mic error:", err);
      toast.error("Microphone access denied. Enable it in your browser settings.");
      setStatus("idle");
    }
  }, [supported, transcribeCumulative, onStart]);

  const toggle = useCallback(() => {
    if (status === "recording") stop();
    else if (status === "idle") start();
  }, [status, start, stop]);

  return { status, supported, toggle };
}
