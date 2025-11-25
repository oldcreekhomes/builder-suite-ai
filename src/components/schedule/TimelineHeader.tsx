import React from "react";
import { DateString, addDays, getCalendarDaysBetween, isBusinessDay, getMonthName, getDayOfMonth } from "@/utils/dateOnly";

interface TimelineHeaderProps {
  startDate: DateString;
  endDate: DateString;
  dayWidth: number;
  timelineWidth: number;
}

export function TimelineHeader({ startDate, endDate, dayWidth, timelineWidth }: TimelineHeaderProps) {
  // Validate dates first
  if (!startDate || !endDate) {
    return <div className="bg-background border-b border-border mt-4 h-8 flex items-center justify-center text-muted-foreground">Invalid date range</div>;
  }

  const totalDays = getCalendarDaysBetween(startDate, endDate);
  const showWeekly = dayWidth <= 12; // Switch to weekly view when zoomed out
  
  // Generate month headers
  const months: { name: string; width: number; left: number }[] = [];
  let currentMonthStart = 0;
  let currentMonth = getMonthName(startDate);
  
  for (let day = 0; day < totalDays; day++) {
    const dayDate = addDays(startDate, day);
    const monthName = getMonthName(dayDate);
    
    if (monthName !== currentMonth || day === totalDays - 1) {
      const dayCount = day === totalDays - 1 ? day - currentMonthStart + 1 : day - currentMonthStart;
      months.push({
        name: currentMonth,
        width: dayCount * dayWidth,
        left: currentMonthStart * dayWidth
      });
      currentMonth = monthName;
      currentMonthStart = day;
    }
  }

  return (
    <div className="bg-background border-b sticky top-0 z-20 h-12">
      {/* Month Row */}
      <div className="relative h-6 border-b border-border/50" style={{ width: timelineWidth }}>
        {months.map((month, index) => (
          <div
            key={index}
            className="absolute top-0 h-full flex items-center justify-center border-r border-border bg-muted/30 font-medium text-xs"
            style={{
              left: month.left,
              width: month.width
            }}
          >
            {month.name}
          </div>
        ))}
      </div>
      
      {/* Day/Week Row */}
      <div className="relative h-6 border-b border-border" style={{ width: timelineWidth }}>
        {showWeekly ? (
          // Weekly view - show 4 weeks per month
          months.map((month, monthIndex) => {
            const weekWidth = month.width / 4;
            return (
              <React.Fragment key={monthIndex}>
                {[1, 2, 3, 4].map(weekNum => (
                  <div
                    key={`${monthIndex}-week-${weekNum}`}
                    className="absolute top-0 h-full flex items-center justify-center border-r border-border text-xs bg-background"
                    style={{
                      left: month.left + (weekNum - 1) * weekWidth,
                      width: weekWidth
                    }}
                  >
                    {weekNum}
                  </div>
                ))}
              </React.Fragment>
            );
          })
        ) : (
          // Daily view - show individual days
          Array.from({ length: totalDays }, (_, i) => {
            const dayDate = addDays(startDate, i);
            const isWeekend = !isBusinessDay(dayDate);
            
            return (
              <div
                key={i}
                className={`absolute top-0 h-full flex items-center justify-center border-r border-border text-xs ${
                  isWeekend ? "bg-blue-100 text-blue-700" : "bg-background"
                }`}
                style={{
                  left: i * dayWidth,
                  width: dayWidth
                }}
              >
                {getDayOfMonth(dayDate)}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}