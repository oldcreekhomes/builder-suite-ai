
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
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
import { useUpdateScheduleTask, ScheduleTask } from "@/hooks/useProjectSchedule";
import { format, addDays, parseISO } from "date-fns";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  task_code: z.string().min(1, "Task code is required"),
  task_name: z.string().min(1, "Task name is required"),
  start_date: z.string().min(1, "Start date is required"),
  duration: z.number().min(1, "Duration must be at least 1 day"),
  progress: z.number().min(0).max(100, "Progress must be between 0 and 100"),
  resources: z.string().optional(),
  predecessor_id: z.string().optional(),
});

interface TaskEditModalProps {
  task: ScheduleTask;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated: () => void;
  allTasks: ScheduleTask[];
}

export function TaskEditModal({
  task,
  open,
  onOpenChange,
  onTaskUpdated,
  allTasks,
}: TaskEditModalProps) {
  const updateTaskMutation = useUpdateScheduleTask();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      task_code: task.task_code,
      task_name: task.task_name,
      start_date: task.start_date,
      duration: task.duration,
      progress: task.progress,
      resources: task.resources.join(', '),
      predecessor_id: task.predecessor_id || "none",
    },
  });

  // Calculate end date based on start date and duration
  const watchedStartDate = form.watch("start_date");
  const watchedDuration = form.watch("duration");
  
  const calculateEndDate = (startDate: string, duration: number) => {
    if (!startDate || !duration) return "";
    const start = new Date(startDate);
    const end = addDays(start, duration - 1);
    return format(end, "yyyy-MM-dd");
  };

  const endDate = calculateEndDate(watchedStartDate, watchedDuration);

  // Reset form when task changes
  useEffect(() => {
    if (task) {
      form.reset({
        task_code: task.task_code,
        task_name: task.task_name,
        start_date: task.start_date,
        duration: task.duration,
        progress: task.progress,
        resources: task.resources.join(', '),
        predecessor_id: task.predecessor_id || "none",
      });
    }
  }, [task, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const startDate = new Date(values.start_date);
    const endDate = addDays(startDate, values.duration - 1);
    
    const resourcesArray = values.resources 
      ? values.resources.split(',').map(r => r.trim()).filter(r => r.length > 0)
      : [];

    await updateTaskMutation.mutateAsync({
      id: task.id,
      updates: {
        task_code: values.task_code,
        task_name: values.task_name,
        start_date: values.start_date,
        end_date: format(endDate, "yyyy-MM-dd"),
        duration: values.duration,
        progress: values.progress,
        resources: resourcesArray,
        predecessor_id: values.predecessor_id === "none" ? undefined : values.predecessor_id,
      },
    });

    onTaskUpdated();
    onOpenChange(false);
  };

  // Filter out the current task from predecessor options
  const availablePredecessors = allTasks.filter(t => t.id !== task.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Task Code */}
              <FormField
                control={form.control}
                name="task_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter task code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Progress */}
              <FormField
                control={form.control}
                name="progress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Progress (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0"
                        max="100"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Task Name */}
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

            <div className="grid grid-cols-3 gap-4">
              {/* Start Date */}
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

              {/* Duration */}
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
                        placeholder="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* End Date (Read-only) */}
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input 
                  type="date" 
                  value={endDate}
                  readOnly
                  className="bg-gray-50 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Predecessor Task */}
            <FormField
              control={form.control}
              name="predecessor_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Predecessor Task</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select predecessor task" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No predecessor</SelectItem>
                      {availablePredecessors.map((availableTask) => (
                        <SelectItem key={availableTask.id} value={availableTask.id}>
                          {availableTask.task_code} - {availableTask.task_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Resources */}
            <FormField
              control={form.control}
              name="resources"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resources (Company Users)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter resource names or emails, separated by commas"
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateTaskMutation.isPending}>
                {updateTaskMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
