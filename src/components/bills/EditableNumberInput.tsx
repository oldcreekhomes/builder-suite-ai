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
  // Display formatted with thousands separators + 2 decimals when not focused.
  const formattedDisplay = Number.isFinite(value)
    ? Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "0.00";
  // Plain numeric string used while focused/editing (no commas, easy to type).
  const editingValue = Number.isFinite(value) ? Number(value).toFixed(2) : "0.00";

  return (
    <Input
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      readOnly={readOnly}
      className={className}
      value={buffer ?? formattedDisplay}
      onFocus={(e) => {
        setBuffer(editingValue);
        requestAnimationFrame(() => {
          try {
            const el = e.target as HTMLInputElement;
            el.select();
          } catch {}
        });
      }}
      onChange={(e) => setBuffer(e.target.value)}
      onBlur={() => {
        const raw = buffer === null ? "" : buffer.replace(/,/g, "").trim();
        const parsed = raw === "" ? 0 : parseFloat(raw);
        const next = Number.isFinite(parsed) ? parsed : 0;
        if (next !== value) onCommit(next);
        setBuffer(null);
      }}
    />
  );
}
