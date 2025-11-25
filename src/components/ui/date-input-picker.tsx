import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";

interface DateInputPickerProps {
  date: Date | undefined;
  onDateChange: (date: Date) => void;
  disabled?: boolean;
  className?: string;
}

export function DateInputPicker({ 
  date, 
  onDateChange, 
  disabled = false,
  className 
}: DateInputPickerProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);

  // Sync input value with date prop
  React.useEffect(() => {
    if (date) {
      setInputValue(format(date, "MM/dd/yyyy"));
    }
  }, [date]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    if (!inputValue.trim()) return;

    // Try to parse various date formats
    const formats = ["MM/dd/yyyy", "M/d/yyyy", "MM-dd-yyyy", "M-d-yyyy"];
    let parsedDate: Date | null = null;

    for (const formatStr of formats) {
      try {
        const parsed = parse(inputValue, formatStr, new Date());
        if (isValid(parsed)) {
          parsedDate = parsed;
          break;
        }
      } catch {
        continue;
      }
    }

    if (parsedDate && isValid(parsedDate)) {
      onDateChange(parsedDate);
      setInputValue(format(parsedDate, "MM/dd/yyyy"));
    } else {
      toast({
        title: "Invalid Date",
        description: "Please enter a valid date (MM/DD/YYYY)",
        variant: "destructive",
      });
      // Reset to current date or empty
      if (date) {
        setInputValue(format(date, "MM/dd/yyyy"));
      } else {
        setInputValue("");
      }
    }
  };

  const handleCalendarSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      onDateChange(selectedDate);
      setInputValue(format(selectedDate, "MM/dd/yyyy"));
      setIsOpen(false);
    }
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        placeholder="MM/DD/YYYY"
        disabled={disabled}
        className="h-10 w-32"
      />
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-10 w-10 p-0"
            disabled={disabled}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleCalendarSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
