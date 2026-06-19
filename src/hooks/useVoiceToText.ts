import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Status = "idle" | "recording" | "transcribing";

export function useVoiceToText(onTranscript: (text: string) => void) {
  const [status, setStatus] = useState<Status>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const supported =
    typeof window !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window.MediaRecorder !== "undefined";

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
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

      const mimeType =
        ["audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size < 1024) {
          setStatus("idle");
          toast.error("That recording was too short — please try again.");
          return;
        }
        setStatus("transcribing");
        try {
          const form = new FormData();
          const ext = (blob.type.split(";")[0].split("/")[1] || "webm").replace("x-", "");
          form.append("file", blob, `recording.${ext}`);
          const { data, error } = await supabase.functions.invoke("voice-to-text", {
            body: form,
          });
          if (error) throw error;
          const text = (data as { text?: string } | null)?.text?.trim();
          if (text) onTranscript(text);
          else toast.error("No speech detected");
        } catch (err) {
          console.error("Transcription error:", err);
          toast.error("Couldn't transcribe audio. Please try again.");
        } finally {
          setStatus("idle");
        }
      };

      recorder.start();
      setStatus("recording");
    } catch (err) {
      console.error("Mic error:", err);
      toast.error("Microphone access denied. Enable it in your browser settings.");
      setStatus("idle");
    }
  }, [supported, onTranscript]);

  const toggle = useCallback(() => {
    if (status === "recording") stop();
    else if (status === "idle") start();
  }, [status, start, stop]);

  return { status, supported, toggle };
}
