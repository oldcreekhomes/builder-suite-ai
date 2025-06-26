
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

  // Get all visible tasks in order
  const getVisibleTasks = () => {
    const visibleTasks: ScheduleTask[] = [];
    parentTasks.forEach(task => {
      visibleTasks.push(task);
      if (!collapsedSections.has(task.id)) {
        visibleTasks.push(...getChildTasks(task.id));
      }
    });
    return visibleTasks;
  };

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
        className="relative h-8 flex items-center"
        data-task-id={task.id}
      >
        <div className="flex items-center w-full h-full">
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

  const renderDependencyLines = () => {
    const visibleTasks = getVisibleTasks();
    const lines = [];

    visibleTasks.forEach((task, taskIndex) => {
      if (task.predecessor_id) {
        const predecessorTask = tasks.find(t => t.id === task.predecessor_id);
        if (predecessorTask) {
          const predecessorIndex = visibleTasks.findIndex(t => t.id === task.predecessor_id);
          
          if (predecessorIndex !== -1) {
            // Calculate positions based on date range
            const predecessorEnd = parseISO(predecessorTask.end_date);
            const taskStart = parseISO(task.start_date);
            
            const predecessorEndIndex = dateRange.findIndex(date => isSameDay(date, predecessorEnd));
            const taskStartIndex = dateRange.findIndex(date => isSameDay(date, taskStart));
            
            if (predecessorEndIndex !== -1 && taskStartIndex !== -1) {
              const totalDays = dateRange.length;
              const predecessorEndPercentage = ((predecessorEndIndex + 1) / totalDays) * 100;
              const taskStartPercentage = (taskStartIndex / totalDays) * 100;
              
              // Vertical positions (32px per row, 16px offset to center on task bar)
              const predecessorY = predecessorIndex * 32 + 16;
              const taskY = taskIndex * 32 + 16;
              
              lines.push(
                <g key={`dependency-${task.id}-${task.predecessor_id}`}>
                  {/* Horizontal line from predecessor end */}
                  <line
                    x1={`${predecessorEndPercentage}%`}
                    y1={predecessorY}
                    x2={`${Math.min(predecessorEndPercentage + 3, taskStartPercentage)}%`}
                    y2={predecessorY}
                    stroke="#64748b"
                    strokeWidth="2"
                  />
                  {/* Vertical line if needed */}
                  {predecessorY !== taskY && (
                    <line
                      x1={`${Math.min(predecessorEndPercentage + 3, taskStartPercentage)}%`}
                      y1={predecessorY}
                      x2={`${Math.min(predecessorEndPercentage + 3, taskStartPercentage)}%`}
                      y2={taskY}
                      stroke="#64748b"
                      strokeWidth="2"
                    />
                  )}
                  {/* Horizontal line to task start with arrow */}
                  <line
                    x1={`${Math.min(predecessorEndPercentage + 3, taskStartPercentage)}%`}
                    y1={taskY}
                    x2={`${taskStartPercentage}%`}
                    y2={taskY}
                    stroke="#64748b"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                  />
                </g>
              );
            }
          }
        }
      }
    });

    return lines;
  };

  const visibleTasks = getVisibleTasks();

  return (
    <div className="p-4 bg-slate-50">
      <div className="overflow-x-auto">
        <div className="min-w-max relative">
          {/* Timeline header - moved to top */}
          <div className="sticky top-0 bg-slate-50 z-10 mb-4">
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
            <div className="flex pb-2">
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
          
          {/* Task bars container */}
          <div className="relative">
            {/* Task bars - render in exact same order as table */}
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
            
            {/* Dependency lines overlay */}
            <svg 
              className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
              style={{ height: `${visibleTasks.length * 32}px` }}
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="4"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <polygon
                    points="0,0 0,8 8,4"
                    fill="#64748b"
                    stroke="#64748b"
                    strokeWidth="1"
                  />
                </marker>
              </defs>
              {renderDependencyLines()}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
