
import { format, parseISO, isSameDay, differenceInDays, startOfWeek, addWeeks, eachWeekOfInterval } from "date-fns";
import { ScheduleTask } from "@/hooks/useProjectSchedule";

interface GanttVisualizationProps {
  tasks: ScheduleTask[];
  dateRange: Date[];
  collapsedSections: Set<string>;
  parentTasks: ScheduleTask[];
  getChildTasks: (parentId: string) => ScheduleTask[];
}

export function GanttVisualization({ 
  tasks, 
  dateRange, 
  collapsedSections, 
  parentTasks, 
  getChildTasks 
}: GanttVisualizationProps) {
  // Create weekly intervals for better timeline view
  const startDate = dateRange[0];
  const endDate = dateRange[dateRange.length - 1];
  const weeks = eachWeekOfInterval({ start: startDate, end: endDate });

  const renderTaskBar = (task: ScheduleTask, isChild = false) => {
    const taskStart = parseISO(task.start_date);
    const taskEnd = parseISO(task.end_date);
    const taskStartIndex = dateRange.findIndex(date => isSameDay(date, taskStart));
    const taskDuration = differenceInDays(taskEnd, taskStart) + 1;
    const totalDays = dateRange.length;
    
    const leftPercentage = (taskStartIndex / totalDays) * 100;
    const widthPercentage = (taskDuration / totalDays) * 100;
    
    return (
      <div 
        key={task.id} 
        className={`
          relative h-8 flex items-center
          ${isChild ? 'ml-8' : ''}
        `}
      >
        <div className="flex items-center w-full h-full">
          {/* Task name */}
          <div className={`
            w-48 flex-shrink-0 text-xs font-medium pr-4 truncate
            ${isChild ? 'text-slate-600 pl-4' : 'text-slate-800'}
          `}>
            {isChild ? '↳ ' : ''}{task.task_name}
          </div>
          
          {/* Timeline container */}
          <div className="flex-1 relative h-6 bg-slate-100 rounded">
            {/* Task bar */}
            <div
              className={`
                absolute h-4 top-1 rounded shadow-sm
                ${isChild ? 'bg-green-500' : 'bg-blue-600'}
                transition-all duration-200 hover:shadow-md
              `}
              style={{
                left: `${leftPercentage}%`,
                width: `${Math.max(widthPercentage, 2)}%`,
                background: `linear-gradient(to right, 
                  ${isChild ? '#10b981' : '#2563eb'} ${task.progress}%, 
                  ${isChild ? '#86efac' : '#93c5fd'} ${task.progress}%)`
              }}
            >
              {/* Progress indicator */}
              {task.progress > 0 && (
                <div className="absolute right-1 top-0 bottom-0 flex items-center">
                  <span className="text-xs font-medium text-white">
                    {task.progress}%
                  </span>
                </div>
              )}
            </div>
            
            {/* Task duration label */}
            <div 
              className="absolute top-5 text-xs text-slate-500 font-medium"
              style={{ left: `${leftPercentage}%` }}
            >
              {task.duration}d
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 bg-slate-50">
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Timeline header */}
          <div className="flex mb-4 sticky top-0 bg-slate-50 z-10 pb-2">
            <div className="w-48 flex-shrink-0 pr-4">
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Timeline
              </div>
            </div>
            <div className="flex-1">
              {/* Month headers */}
              <div className="flex border-b border-slate-200 pb-2 mb-2">
                {weeks.map((week, index) => (
                  <div
                    key={index}
                    className="text-xs font-semibold text-slate-700 text-center px-2"
                    style={{ width: `${100 / weeks.length}%` }}
                  >
                    {format(week, 'MMM yyyy')}
                  </div>
                ))}
              </div>
              
              {/* Week grid */}
              <div className="flex">
                {dateRange.map((date, index) => (
                  <div
                    key={index}
                    className={`
                      w-6 text-xs text-center py-1 border-r border-slate-200/50
                      ${format(date, 'E') === 'Sat' || format(date, 'E') === 'Sun' 
                        ? 'bg-slate-200/30' 
                        : 'bg-white'
                      }
                    `}
                  >
                    {format(date, 'dd')}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Task bars */}
          <div className="space-y-0">
            {parentTasks.map(task => (
              <div key={task.id}>
                {renderTaskBar(task)}
                {!collapsedSections.has(task.id) && 
                  getChildTasks(task.id).map(childTask => 
                    renderTaskBar(childTask, true)
                  )
                }
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
