import React from "react";
import { format, addDays, isSameMonth } from "date-fns";

interface TimelineHeaderProps {
  startDate: Date;
  endDate: Date;
  dayWidth: number;
  timelineWidth: number;
}

export function TimelineHeader({ startDate, endDate, dayWidth, timelineWidth }: TimelineHeaderProps) {
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Generate month headers
  const months: { name: string; width: number; left: number }[] = [];
  let currentDate = new Date(startDate);
  let currentMonthStart = 0;
  let currentMonth = format(currentDate, "MMM yyyy");
  
  for (let day = 0; day <= totalDays; day++) {
    const dayDate = addDays(startDate, day);
    const monthName = format(dayDate, "MMM yyyy");
    
    if (monthName !== currentMonth || day === totalDays) {
      months.push({
        name: currentMonth,
        width: (day - currentMonthStart) * dayWidth,
        left: currentMonthStart * dayWidth
      });
      currentMonth = monthName;
      currentMonthStart = day;
    }
  }

  return (
    <div className="bg-background border-b border-border mt-0.5">
      {/* Month Row */}
      <div className="relative h-4 border-b border-border" style={{ width: timelineWidth }}>
        {months.map((month, index) => (
          <div
            key={index}
            className="absolute top-0 h-full flex items-center justify-center border-r border-border bg-muted/30 font-medium text-sm"
            style={{
              left: month.left,
              width: month.width
            }}
          >
            {month.name}
          </div>
        ))}
      </div>
      
      {/* Day Row */}
      <div className="relative h-4" style={{ width: timelineWidth }}>
        {Array.from({ length: totalDays }, (_, i) => {
          const dayDate = addDays(startDate, i);
          const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
          
          return (
            <div
              key={i}
              className={`absolute top-0 h-full flex items-center justify-center border-r border-border text-xs ${
                isWeekend ? "bg-muted/50" : "bg-background"
              }`}
              style={{
                left: i * dayWidth,
                width: dayWidth
              }}
            >
              {format(dayDate, "dd")}
            </div>
          );
        })}
      </div>
    </div>
  );
}