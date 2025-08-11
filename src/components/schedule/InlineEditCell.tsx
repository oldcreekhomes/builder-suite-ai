import React, { useState, useRef, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface InlineEditCellProps {
  value: string | number;
  type: "text" | "number" | "date";
  onSave: (value: string | number) => void;
  className?: string;
  displayFormat?: (value: any) => string;
}

export function InlineEditCell({ 
  value, 
  type, 
  onSave, 
  className = "",
  displayFormat 
}: InlineEditCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [showCalendar, setShowCalendar] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (type === "text") {
        inputRef.current.select();
      }
    }
  }, [isEditing, type]);

  const handleSave = () => {
    onSave(editValue);
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
      const formattedDate = format(date, "yyyy-MM-dd");
      onSave(formattedDate);
      setShowCalendar(false);
    }
  };

  const displayValue = displayFormat ? displayFormat(value) : String(value);

  if (type === "date") {
    return (
      <Popover open={showCalendar} onOpenChange={setShowCalendar}>
        <PopoverTrigger asChild>
          <span
            className={cn(
              "cursor-pointer hover:bg-muted rounded px-1 py-0.5 block text-xs",
              className
            )}
            onClick={() => setShowCalendar(true)}
          >
            {displayValue}
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value ? new Date(value + "T00:00:00") : undefined}
            onSelect={handleDateSelect}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="relative">
      {isEditing ? (
        <input
          ref={inputRef}
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(type === "number" ? Number(e.target.value) : e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={cn(
            "bg-transparent border-none outline-none text-xs w-full p-0",
            "focus:ring-0 focus:border-none",
            className
          )}
          style={{
            caretColor: "black",
            fontSize: "inherit",
            fontFamily: "inherit",
          }}
        />
      ) : (
        <span
          ref={spanRef}
          onClick={() => setIsEditing(true)}
          className={cn(
            "cursor-text hover:bg-muted rounded px-1 py-0.5 block text-xs",
            className
          )}
        >
          {displayValue}
        </span>
      )}
    </div>
  );
}