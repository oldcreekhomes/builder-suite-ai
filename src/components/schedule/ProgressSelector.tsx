import React, { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface ProgressSelectorProps {
  value: number;
  onSave: (value: number) => void;
  className?: string;
  readOnly?: boolean;
}

const progressOptions = [0, 25, 50, 75, 100];

export function ProgressSelector({ 
  value, 
  onSave, 
  className = "",
  readOnly = false
}: ProgressSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleValueChange = (newValue: string) => {
    const numValue = parseInt(newValue);
    onSave(numValue);
    setIsOpen(false);
  };

  // If readOnly, always show as non-editable text
  if (readOnly) {
    return (
      <span className={cn("text-xs px-1 py-0.5 block text-black", className)}>
        {value}%
      </span>
    );
  }

  return (
    <Select 
      value={value.toString()} 
      onValueChange={handleValueChange}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <SelectTrigger 
        className={cn(
          "h-6 text-xs border-none shadow-none bg-transparent hover:bg-muted rounded px-1 py-0.5 w-full",
          className
        )}
      >
        <SelectValue placeholder="0%">
          {value}%
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="min-w-[60px] bg-popover border border-border shadow-lg">
        {progressOptions.map((option) => (
          <SelectItem 
            key={option} 
            value={option.toString()}
            className="text-xs hover:bg-accent cursor-pointer"
          >
            {option}%
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}