import { Sparkles } from "lucide-react";

export function MlProcessingMessage({ text, detail, className = "py-16" }: { text: string; detail?: string; className?: string }) {
  return (
    <>
      <style>{`
        @keyframes ml-float {
          0%, 100% { transform: translateY(0) scale(1) rotate(0deg); opacity: 0.85; }
          50% { transform: translateY(-6px) scale(1.1) rotate(8deg); opacity: 1; }
        }
        @keyframes ml-dots {
          0%, 20% { content: ''; }
          40% { content: '.'; }
          60% { content: '..'; }
          80%, 100% { content: '...'; }
        }
        .ml-icon { animation: ml-float 1.8s ease-in-out infinite; }
        .ml-text::after { display: inline-block; width: 1.25em; text-align: left; content: ''; animation: ml-dots 1.6s steps(1, end) infinite; }
      `}</style>
      <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
        <Sparkles className="ml-icon h-12 w-12 text-primary" />
        <p className="ml-text text-sm font-medium text-muted-foreground">{text}</p>
        {detail && <p className="text-xs text-muted-foreground -mt-2">{detail}</p>}
      </div>
    </>
  );
}
