
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAddScheduleTask, ScheduleTask } from "@/hooks/useProjectSchedule";
import { format, addDays } from "date-fns";

const formSchema = z.object({
  task_name: z.string().min(1, "Task name is required"),
  start_date: z.string().min(1, "Start date is required"),
  duration: z.number().min(1, "Duration must be at least 1 day"),
  resources: z.string().optional(),
  predecessor_id: z.string().optional(),
});

interface AddTaskDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskAdded: () => void;
  existingTasks: ScheduleTask[];
}

export function AddTaskDialog({
  projectId,
  open,
  onOpenChange,
  onTaskAdded,
  existingTasks,
}: AddTaskDialogProps) {
  const [taskCode, setTaskCode] = useState("");
  const addTaskMutation = useAddScheduleTask();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      task_name: "",
      start_date: format(new Date(), "yyyy-MM-dd"),
      duration: 1,
      resources: "",
      predecessor_id: "none",
    },
  });

  // Generate task code when dialog opens
  useEffect(() => {
    if (open) {
      const nextTaskNumber = existingTasks.length + 1;
      const code = `TASK-${String(nextTaskNumber).padStart(3, '0')}`;
      setTaskCode(code);
    }
  }, [open, existingTasks.length]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const startDate = new Date(values.start_date);
    const endDate = addDays(startDate, values.duration - 1);
    
    const resourcesArray = values.resources 
      ? values.resources.split(',').map(r => r.trim()).filter(r => r.length > 0)
      : [];

    await addTaskMutation.mutateAsync({
      project_id: projectId,
      task_code: taskCode,
      task_name: values.task_name,
      start_date: values.start_date,
      end_date: format(endDate, "yyyy-MM-dd"),
      duration: values.duration,
      progress: 0,
      resources: resourcesArray,
      predecessor_id: values.predecessor_id === "none" ? undefined : values.predecessor_id,
    });

    form.reset();
    onTaskAdded();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
          <DialogDescription>
            Create a new task for your project schedule.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Task Code and Name Row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="task_code">Code</Label>
                <Input
                  id="task_code"
                  value={taskCode}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name="task_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter task name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Date and Duration Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (days)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Resources */}
            <FormField
              control={form.control}
              name="resources"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resources (comma-separated emails)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="user1@example.com, user2@example.com"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Predecessor */}
            <FormField
              control={form.control}
              name="predecessor_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Predecessor Task</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select predecessor (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No predecessor</SelectItem>
                      {existingTasks.map((task) => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.task_code} - {task.task_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addTaskMutation.isPending}>
                {addTaskMutation.isPending ? "Adding..." : "Add Task"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
