import React, { useState, useRef, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { format, parse, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

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
  const [manualDateInput, setManualDateInput] = useState("");
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

  // Pre-fill manual date input when calendar opens with existing date
  useEffect(() => {
    if (showCalendar && type === "date" && value && String(value).trim()) {
      // value is in YYYY-MM-DD format, convert to MM/DD/YYYY
      const dateObj = new Date(value + "T12:00:00");
      if (isValid(dateObj)) {
        setManualDateInput(format(dateObj, "MM/dd/yyyy"));
      }
    }
  }, [showCalendar, type, value]);

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
      setManualDateInput("");
    }
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Remove all non-digit characters
    const digitsOnly = input.replace(/\D/g, '');
    
    // Limit to 8 digits (MMDDYYYY)
    const limited = digitsOnly.slice(0, 8);
    
    // Auto-insert slashes
    let formatted = '';
    for (let i = 0; i < limited.length; i++) {
      if (i === 2 || i === 4) {
        formatted += '/';
      }
      formatted += limited[i];
    }
    
    setManualDateInput(formatted);
  };

  const handleManualDateSubmit = () => {
    if (!manualDateInput.trim()) return;
    
    // Try to parse various date formats
    const formats = ["MM/dd/yyyy", "M/d/yyyy", "MM-dd-yyyy", "M-d-yyyy"];
    let parsedDate: Date | null = null;

    for (const formatStr of formats) {
      try {
        const parsed = parse(manualDateInput, formatStr, new Date());
        if (isValid(parsed)) {
          parsedDate = parsed;
          break;
        }
      } catch {
        continue;
      }
    }

    if (parsedDate && isValid(parsedDate)) {
      parsedDate.setHours(12, 0, 0, 0);
      const formattedDate = format(parsedDate, "yyyy-MM-dd");
      onSave(formattedDate);
      setShowCalendar(false);
      setManualDateInput("");
    } else {
      toast({
        title: "Invalid Date",
        description: "Please enter a valid date (MM/DD/YYYY)",
        variant: "destructive",
      });
    }
  };

  // If readOnly, always show as non-editable text
  if (readOnly) {
    return (
      <span className={cn("text-[length:var(--schedule-font-size)] px-1 py-0.5 inline-block text-black whitespace-nowrap", className)}>
        {getDisplayValue()}
      </span>
    );
  }

  // Helper to get calendar date - existing date or today for new tasks
  const getCalendarDate = (): Date => {
    if (value && String(value).trim()) {
      return new Date(value + "T12:00:00");
    }
    return new Date();
  };

  if (type === "date") {
    return (
      <Popover open={showCalendar} onOpenChange={setShowCalendar}>
        <PopoverTrigger asChild>
        <span
          className={cn(
            "cursor-pointer hover:bg-muted rounded px-1 py-0.5 inline-block text-[length:var(--schedule-font-size)] whitespace-nowrap",
            className
          )}
          onClick={() => setShowCalendar(true)}
        >
          {getDisplayValue()}
        </span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 border-b">
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={manualDateInput}
                onChange={handleDateInputChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleManualDateSubmit();
                  }
                }}
                placeholder="MM/DD/YYYY"
                className="h-8 w-full text-sm"
                autoFocus={false}
              />
            </div>
          </div>
          <Calendar
            mode="single"
            selected={getCalendarDate()}
            defaultMonth={getCalendarDate()}
            onSelect={handleDateSelect}
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
            "bg-transparent border-none outline-none text-[length:var(--schedule-font-size)] w-full p-0",
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
            "cursor-text hover:bg-muted rounded px-1 py-0.5 inline-block text-[length:var(--schedule-font-size)] text-black whitespace-nowrap",
            className
          )}
        >
          {getDisplayValue()}
        </span>
      )}
    </div>
  );
}