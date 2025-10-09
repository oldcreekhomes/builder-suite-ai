import { useState, useRef, useEffect } from "react";
import { Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AccountTransactionInlineEditorProps {
  value: string | number | Date;
  field: "date" | "reference" | "vendor" | "description" | "amount";
  onSave: (value: string | number | Date) => void;
  readOnly?: boolean;
}

export function AccountTransactionInlineEditor({
  value,
  field,
  onSave,
  readOnly = false,
}: AccountTransactionInlineEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [showCalendar, setShowCalendar] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current && field !== "date") {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing, field]);

  const handleSave = () => {
    if (field === "amount") {
      const numValue = editValue === "" ? 0 : Number(editValue);
      onSave(numValue);
    } else {
      onSave(editValue);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onSave(date);
      setShowCalendar(false);
    }
  };

  if (readOnly) {
    return (
      <span className="text-sm">
        {field === "date" && value instanceof Date
          ? format(value, "MM/dd/yyyy")
          : field === "amount"
          ? typeof value === "number"
            ? `$${value.toFixed(2)}`
            : String(value)
          : String(value)}
      </span>
    );
  }

  if (field === "date") {
    return (
      <Popover open={showCalendar} onOpenChange={setShowCalendar}>
        <PopoverTrigger asChild>
          <div className="group flex items-center gap-2 cursor-pointer hover:bg-muted/50 px-2 py-1 rounded">
            <span className="text-sm">
              {value instanceof Date ? format(value, "MM/dd/yyyy") : value}
            </span>
            <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value instanceof Date ? value : new Date()}
            onSelect={handleDateSelect}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    );
  }

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type={field === "amount" ? "number" : "text"}
        value={editValue.toString()}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="h-8 text-sm"
        step={field === "amount" ? "0.01" : undefined}
      />
    );
  }

  return (
    <div
      className="group flex items-center gap-2 cursor-pointer hover:bg-muted/50 px-2 py-1 rounded"
      onClick={() => setIsEditing(true)}
    >
      <span className="text-sm">
        {field === "amount" && typeof value === "number"
          ? `$${value.toFixed(2)}`
          : String(value)}
      </span>
      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
    </div>
  );
}
