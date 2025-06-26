
import { format, addDays } from "date-fns";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { TableCell, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScheduleTask } from "@/hooks/useProjectSchedule";
import { getTaskNumber } from "./utils/ganttUtils";

interface NewTask {
  task_name: string;
  start_date: string;
  duration: number;
  resources: string;
  predecessor_id?: string;
}

interface NewTaskRowProps {
  newTask: NewTask;
  tasks: ScheduleTask[];
  onNewTaskChange: (newTask: NewTask) => void;
  onSaveNewTask: () => void;
  onCancelNewTask: () => void;
}

export function NewTaskRow({
  newTask,
  tasks,
  onNewTaskChange,
  onSaveNewTask,
  onCancelNewTask,
}: NewTaskRowProps) {
  const nextTaskNumber = tasks.length + 1;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSaveNewTask();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancelNewTask();
    }
  };

  return (
    <TableRow className="bg-blue-50/30 border-blue-200 h-12">
      {/* Checkbox */}
      <TableCell className="py-1 w-12">
        <Checkbox className="h-3 w-3" disabled />
      </TableCell>

      {/* Code */}
      <TableCell className="font-mono text-xs text-slate-600 py-1 relative w-16">
        <div className="flex items-center">
          <span className="px-1 py-0.25 rounded text-xs font-medium ml-4 text-black">
            {nextTaskNumber}
          </span>
        </div>
      </TableCell>

      {/* Name */}
      <TableCell className="py-2 text-xs min-w-[200px]">
        <Input
          value={newTask.task_name}
          onChange={(e) => onNewTaskChange({...newTask, task_name: e.target.value})}
          placeholder="Enter task name..."
          className="h-8 text-sm border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white shadow-sm"
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </TableCell>

      {/* Start Date */}
      <TableCell className="py-2 text-xs w-28">
        <Input
          type="date"
          value={newTask.start_date}
          onChange={(e) => onNewTaskChange({...newTask, start_date: e.target.value})}
          className="h-8 text-sm border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white shadow-sm"
          onKeyDown={handleKeyDown}
        />
      </TableCell>

      {/* Duration */}
      <TableCell className="py-2 text-xs w-20">
        <div className="flex items-center space-x-1">
          <Input
            type="number"
            value={newTask.duration}
            onChange={(e) => onNewTaskChange({...newTask, duration: parseInt(e.target.value) || 1})}
            className="h-8 text-sm w-14 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white shadow-sm"
            min="1"
            onKeyDown={handleKeyDown}
          />
          <span className="text-slate-500 text-sm font-medium">d</span>
        </div>
      </TableCell>

      {/* End Date */}
      <TableCell className="py-2 text-xs w-28">
        <div className="px-2 py-1 bg-slate-50 rounded-md border border-slate-200">
          <span className="text-slate-600 text-sm font-medium whitespace-nowrap">
            {format(addDays(new Date(newTask.start_date), newTask.duration - 1), 'MMM dd')}
          </span>
        </div>
      </TableCell>

      {/* Progress */}
      <TableCell className="py-2 w-24">
        <div className="flex items-center space-x-2">
          <Progress value={0} className="w-10 h-2 bg-slate-100" />
          <span className="text-slate-500 text-sm font-medium w-8">0%</span>
        </div>
      </TableCell>

      {/* Resources */}
      <TableCell className="py-2 text-xs w-32">
        <Input
          value={newTask.resources}
          onChange={(e) => onNewTaskChange({...newTask, resources: e.target.value})}
          placeholder="Enter resources..."
          className="h-8 text-sm border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white shadow-sm"
          onKeyDown={handleKeyDown}
        />
      </TableCell>

      {/* Predecessors */}
      <TableCell className="py-2 text-xs w-28">
        <Select
          value={newTask.predecessor_id || "none"}
          onValueChange={(value) => onNewTaskChange({...newTask, predecessor_id: value === "none" ? undefined : value})}
        >
          <SelectTrigger className="h-8 text-sm border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white shadow-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border-slate-200 shadow-lg">
            <SelectItem value="none" className="text-sm">None</SelectItem>
            {tasks.map((task) => (
              <SelectItem key={task.id} value={task.id} className="text-sm">
                Task {getTaskNumber(task.task_code)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
    </TableRow>
  );
}
