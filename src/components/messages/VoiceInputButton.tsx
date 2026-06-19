import { Mic, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceToText } from "@/hooks/useVoiceToText";
import { cn } from "@/lib/utils";

interface VoiceInputButtonProps {
  onStart?: () => void;
  onLiveText: (fullText: string) => void;
  size?: "sm" | "md";
}

export function VoiceInputButton({ onStart, onLiveText, size = "md" }: VoiceInputButtonProps) {
  const { status, supported, toggle } = useVoiceToText({ onStart, onLiveText });

  if (!supported) return null;

  const dims = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const icon = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  const title =
    status === "recording"
      ? "Stop recording"
      : status === "transcribing"
      ? "Transcribing..."
      : "Record voice message";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(dims, "p-0", status === "recording" && "text-destructive animate-pulse")}
      onClick={toggle}
      disabled={status === "transcribing"}
      title={title}
      aria-label={title}
    >
      {status === "transcribing" ? (
        <Loader2 className={cn(icon, "animate-spin")} />
      ) : status === "recording" ? (
        <Square className={cn(icon, "fill-current")} />
      ) : (
        <Mic className={icon} />
      )}
    </Button>
  );
}
