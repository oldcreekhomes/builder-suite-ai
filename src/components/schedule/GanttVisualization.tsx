
import { format, parseISO, isSameDay, differenceInDays } from "date-fns";
import { ScheduleTask } from "@/hooks/useProjectSchedule";

interface GanttVisualizationProps {
  tasks: ScheduleTask[];
  dateRange: Date[];
}

export function GanttVisualization({ tasks, dateRange }: GanttVisualizationProps) {
  const parentTasks = tasks.filter(task => !task.predecessor_id);
  const childTasks = tasks.filter(task => task.predecessor_id);

  const getChildTasks = (parentId: string) => {
    return childTasks.filter(task => task.predecessor_id === parentId);
  };

  const renderGanttRow = (task: ScheduleTask, isChild = false) => {
    const startDate = parseISO(task.start_date);
    const endDate = parseISO(task.end_date);
    const taskStartIndex = dateRange.findIndex(date => isSameDay(date, startDate));
    const taskDuration = differenceInDays(endDate, startDate) + 1;
    
    return (
      <div key={task.id} className={`mb-1 ${isChild ? 'ml-4' : ''}`}>
        <div className="flex items-center h-10">
          <div className="w-48 flex-shrink-0 text-xs font-medium pr-4 truncate">
            {isChild ? '↳ ' : ''}{task.task_name}
          </div>
          <div className="flex relative">
            {dateRange.map((_, index) => (
              <div
                key={index}
                className={`w-8 ${isChild ? 'h-3' : 'h-4'} border-r border-gray-200`}
              >
                {index >= taskStartIndex && index < taskStartIndex + taskDuration && (
                  <div 
                    className={`h-full rounded ${isChild ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{
                      background: `linear-gradient(to right, ${isChild ? '#10b981' : '#3b82f6'} ${task.progress}%, #e5e7eb ${task.progress}%)`
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-3">
      <div className="overflow-x-auto">
        <div className="min-w-max">
          <div className="flex mb-2">
            <div className="w-48 flex-shrink-0"></div>
            {dateRange.map((date, index) => (
              <div
                key={index}
                className="w-8 text-xs text-center border-r border-gray-200 p-1"
              >
                {format(date, 'dd')}
              </div>
            ))}
          </div>
          
          {parentTasks.map(task => (
            <div key={task.id}>
              {renderGanttRow(task)}
              {getChildTasks(task.id).map(childTask => 
                renderGanttRow(childTask, true)
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
