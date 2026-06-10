import { useState } from "react";
import { Input } from "@/components/ui/input";

interface EditableNumberInputProps {
  value: number;
  onCommit: (value: number) => void;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
  step?: string;
}

/**
 * Number input that buffers user keystrokes while focused so React never
 * overwrites in-progress typing, then formats to 2 decimals on blur.
 * Display value is always formatted with 2 fraction digits when not focused.
 */
export function EditableNumberInput({
  value,
  onCommit,
  readOnly,
  className,
  placeholder = "0.00",
  step = "0.01",
}: EditableNumberInputProps) {
  const [buffer, setBuffer] = useState<string | null>(null);
  const formatted = Number.isFinite(value) ? Number(value).toFixed(2) : "0.00";

  return (
    <Input
      type="number"
      step={step}
      placeholder={placeholder}
      readOnly={readOnly}
      className={className}
      value={buffer ?? formatted}
      onFocus={(e) => {
        setBuffer(formatted);
        // place cursor at end for convenience
        requestAnimationFrame(() => {
          try {
            const el = e.target as HTMLInputElement;
            el.select();
          } catch {}
        });
      }}
      onChange={(e) => setBuffer(e.target.value)}
      onBlur={() => {
        const parsed = buffer === null || buffer === "" ? 0 : parseFloat(buffer);
        const next = Number.isFinite(parsed) ? parsed : 0;
        if (next !== value) onCommit(next);
        setBuffer(null);
      }}
    />
  );
}
