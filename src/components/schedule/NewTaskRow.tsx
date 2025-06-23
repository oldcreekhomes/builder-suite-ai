
import { format, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { TableCell, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X } from "lucide-react";
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

  return (
    <TableRow className="bg-blue-50 h-10">
      <TableCell className="pl-4 font-medium py-1 text-xs w-16">
        {nextTaskNumber}
      </TableCell>
      <TableCell className="py-1 text-xs min-w-[120px] max-w-[150px]">
        <Input
          value={newTask.task_name}
          onChange={(e) => onNewTaskChange({...newTask, task_name: e.target.value})}
          placeholder="Task name"
          className="h-6 text-xs"
        />
      </TableCell>
      <TableCell className="py-1 text-xs w-20">
        <Input
          type="date"
          value={newTask.start_date}
          onChange={(e) => onNewTaskChange({...newTask, start_date: e.target.value})}
          className="h-6 text-xs"
        />
      </TableCell>
      <TableCell className="py-1 text-xs w-16">
        <div className="flex items-center space-x-1">
          <Input
            type="number"
            value={newTask.duration}
            onChange={(e) => onNewTaskChange({...newTask, duration: parseInt(e.target.value) || 1})}
            className="h-6 text-xs w-12 flex-shrink-0"
            min="1"
          />
          <span className="text-xs flex-shrink-0">d</span>
        </div>
      </TableCell>
      <TableCell className="py-1 text-xs w-20">
        <span className="whitespace-nowrap">{format(addDays(new Date(newTask.start_date), newTask.duration - 1), 'MMM dd')}</span>
      </TableCell>
      <TableCell className="py-1 w-24">
        <div className="flex items-center space-x-2">
          <Progress value={0} className="w-8 h-1 flex-shrink-0" />
          <span className="text-xs w-12 flex-shrink-0">0%</span>
        </div>
      </TableCell>
      <TableCell className="py-1 w-20">
        <Input
          value={newTask.resources}
          onChange={(e) => onNewTaskChange({...newTask, resources: e.target.value})}
          placeholder="emails"
          className="h-6 text-xs"
        />
      </TableCell>
      <TableCell className="py-1 w-20">
        <Select 
          value={newTask.predecessor_id || "none"} 
          onValueChange={(value) => onNewTaskChange({...newTask, predecessor_id: value === "none" ? undefined : value})}
        >
          <SelectTrigger className="h-6 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {tasks.map((task) => (
              <SelectItem key={task.id} value={task.id}>
                {getTaskNumber(task.task_code)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="py-1 w-20">
        <div className="flex space-x-1">
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 flex-shrink-0" onClick={onSaveNewTask}>
            <Check className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 flex-shrink-0" onClick={onCancelNewTask}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
