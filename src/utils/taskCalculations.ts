import { ProjectTask } from "@/hooks/useProjectTasks";

export interface TaskCalculations {
  startDate: string;
  endDate: string;
  duration: number;
  progress: number;
}

export const getChildTasks = (parentTask: ProjectTask, allTasks: ProjectTask[]): ProjectTask[] => {
  if (!parentTask.hierarchy_number) return [];
  
  return allTasks.filter(task => {
    if (!task.hierarchy_number || task.id === parentTask.id) return false;
    
    // Check if task is a direct child (e.g., parent "1" has children "1.1", "1.2", etc.)
    const parentParts = parentTask.hierarchy_number.split('.');
    const taskParts = task.hierarchy_number.split('.');
    
    // Direct child should have exactly one more part than parent
    if (taskParts.length !== parentParts.length + 1) return false;
    
    // All parent parts should match
    for (let i = 0; i < parentParts.length; i++) {
      if (parentParts[i] !== taskParts[i]) return false;
    }
    
    return true;
  });
};

export const getAllDescendantTasks = (parentTask: ProjectTask, allTasks: ProjectTask[]): ProjectTask[] => {
  if (!parentTask.hierarchy_number) return [];
  
  return allTasks.filter(task => {
    if (!task.hierarchy_number || task.id === parentTask.id) return false;
    return task.hierarchy_number.startsWith(parentTask.hierarchy_number + '.');
  });
};

export const calculateParentTaskValues = (parentTask: ProjectTask, allTasks: ProjectTask[]): TaskCalculations | null => {
  const childTasks = getAllDescendantTasks(parentTask, allTasks);
  
  if (childTasks.length === 0) {
    return null;
  }
  
  // Calculate start date (earliest start date among children)
  const startDates = childTasks.map(task => new Date(task.start_date));
  const earliestStartDate = new Date(Math.min(...startDates.map(date => date.getTime())));
  
  // Calculate end date (latest end date among children)
  const endDates = childTasks.map(task => new Date(task.end_date));
  const latestEndDate = new Date(Math.max(...endDates.map(date => date.getTime())));
  
  // Calculate duration (difference between latest end date and earliest start date)
  const timeDiff = latestEndDate.getTime() - earliestStartDate.getTime();
  const duration = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)); // Convert to days and round up
  
  // Calculate progress based on completed duration vs total duration
  const totalDuration = childTasks.reduce((sum, task) => sum + task.duration, 0);
  const completedDuration = childTasks.reduce((sum, task) => {
    const taskProgress = (task.progress || 0) / 100; // Convert percentage to decimal
    return sum + (task.duration * taskProgress);
  }, 0);
  const progressPercentage = totalDuration > 0 ? Math.round((completedDuration / totalDuration) * 100) : 0;
  
  return {
    startDate: earliestStartDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
    endDate: latestEndDate.toISOString().split('T')[0],
    duration,
    progress: progressPercentage
  };
};

export const shouldUpdateParentTask = (task: ProjectTask, calculations: TaskCalculations): boolean => {
  return (
    task.start_date.split('T')[0] !== calculations.startDate ||
    task.end_date.split('T')[0] !== calculations.endDate ||
    task.duration !== calculations.duration ||
    (task.progress || 0) !== calculations.progress
  );
};