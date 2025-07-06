import React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface BiddingDatePickerProps {
  value: string | null;
  onChange: (biddingItemId: string, companyId: string, date: string | null) => void;
  placeholder: string;
  disabled?: boolean;
  companyId: string;
  biddingItemId: string;
}

export function BiddingDatePicker({ 
  value, 
  onChange, 
  placeholder, 
  disabled,
  companyId,
  biddingItemId
}: BiddingDatePickerProps) {
  const date = value ? new Date(value) : undefined;
  
  const handleDateChange = (newDate: Date | undefined) => {
    const dateString = newDate ? newDate.toISOString() : null;
    onChange(biddingItemId, companyId, dateString);
  };
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full h-8 text-sm justify-start text-left font-normal max-w-[120px]",
            !date && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          {date ? format(date, "MM/dd/yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateChange}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}