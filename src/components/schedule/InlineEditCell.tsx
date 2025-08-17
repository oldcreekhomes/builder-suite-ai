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
  readOnly?: boolean;
}

export function InlineEditCell({ 
  value, 
  type, 
  onSave, 
  className = "",
  displayFormat,
  readOnly = false
}: InlineEditCellProps) {
  // Helper functions defined first
  const getEditValue = () => {
    if (type === "number" && (value === 0 || value === "0")) {
      return "";
    }
    return value;
  };

  const getDisplayValue = () => {
    if (type === "number" && (value === 0 || value === "0")) {
      return displayFormat ? displayFormat(0) : "";
    }
    return displayFormat ? displayFormat(value) : String(value);
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(getEditValue());
  const [showCalendar, setShowCalendar] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (type === "text" || type === "number") {
        inputRef.current.select();
      }
    }
  }, [isEditing, type]);

  const handleSave = () => {
    // Handle empty values for number inputs
    let saveValue = editValue;
    if (type === "number" && (editValue === "" || editValue === null || editValue === undefined)) {
      saveValue = 0;
    }
    onSave(saveValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditValue(getEditValue());
      setIsEditing(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // Set to noon to avoid timezone edge cases
      const adjustedDate = new Date(date);
      adjustedDate.setHours(12, 0, 0, 0);
      const formattedDate = format(adjustedDate, "yyyy-MM-dd");
      onSave(formattedDate);
      setShowCalendar(false);
    }
  };

  // If readOnly, always show as non-editable text
  if (readOnly) {
    return (
      <span className={cn("text-xs px-1 py-0.5 block text-primary", className)}>
        {getDisplayValue()}
      </span>
    );
  }

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
            {getDisplayValue()}
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value ? new Date(value + "T12:00:00") : undefined}
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
            // Hide number input spinners
            type === "number" && "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
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
            "cursor-text hover:bg-muted rounded px-1 py-0.5 block text-xs text-primary",
            className
          )}
        >
          {getDisplayValue()}
        </span>
      )}
    </div>
  );
}