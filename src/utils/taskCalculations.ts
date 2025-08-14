import { ProjectTask } from "@/hooks/useProjectTasks";
import { getBusinessDaysBetween, calculateBusinessEndDate, addBusinessDays, isBusinessDay, ensureBusinessDay } from "./businessDays";

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
  
  // Calculate duration using business days only
  const duration = getBusinessDaysBetween(earliestStartDate, latestEndDate);
  
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

export interface TaskDateUpdate {
  startDate: string;
  endDate: string;
  duration: number;
}

// Calculate task dates based on predecessors
export const calculateTaskDatesFromPredecessors = (
  task: ProjectTask, 
  allTasks: ProjectTask[]
): TaskDateUpdate | null => {
  if (!task.predecessor) return null;
  
  // Parse predecessors
  let predecessors: string[] = [];
  try {
    if (Array.isArray(task.predecessor)) {
      predecessors = task.predecessor;
    } else if (typeof task.predecessor === 'string') {
      predecessors = JSON.parse(task.predecessor);
    }
  } catch {
    // If parsing fails, treat as single predecessor
    predecessors = [task.predecessor as string];
  }
  
  if (predecessors.length === 0) return null;
  
  let latestEndDate = new Date(0); // Start with earliest possible date
  
  // Find the latest end date among all predecessors
  for (const predStr of predecessors) {
    // Parse predecessor format: "taskId" or "taskId+lag" or "taskId-lag"
    const match = predStr.match(/^(.+?)([+-]\d+)?$/);
    if (!match) continue;
    
    const predTaskId = match[1].trim();
    const lagDays = match[2] ? parseInt(match[2]) : 0;
    
    // Find the predecessor task by hierarchy number or ID
    const predTask = allTasks.find(t => 
      t.hierarchy_number === predTaskId || t.id === predTaskId
    );
    
    if (!predTask) continue;
    
    // Calculate the end date of the predecessor with business day lag
    const predEndDate = new Date(predTask.end_date);
    
    // Apply lag using business days
    let adjustedPredEndDate: Date;
    if (lagDays > 0) {
      adjustedPredEndDate = addBusinessDays(predEndDate, lagDays);
    } else if (lagDays < 0) {
      // For negative lag, we need to subtract business days
      adjustedPredEndDate = addBusinessDays(predEndDate, lagDays);
    } else {
      adjustedPredEndDate = predEndDate;
    }
    
    if (adjustedPredEndDate > latestEndDate) {
      latestEndDate = adjustedPredEndDate;
    }
  }
  
  // If no valid predecessors found, return null
  if (latestEndDate.getTime() === 0) return null;
  
  // New start date is the next business day after the latest predecessor end date
  const newStartDate = addBusinessDays(latestEndDate, 1);
  
  // Calculate new end date based on task duration using business days
  const newEndDate = calculateBusinessEndDate(newStartDate, task.duration);
  
  return {
    startDate: newStartDate.toISOString().split('T')[0],
    endDate: newEndDate.toISOString().split('T')[0],
    duration: task.duration
  };
};

// Get all tasks that depend on a given task (have it as predecessor)
export const getDependentTasks = (taskId: string, allTasks: ProjectTask[]): ProjectTask[] => {
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return [];
  
  const taskHierarchy = task.hierarchy_number;
  
  return allTasks.filter(t => {
    if (!t.predecessor || t.id === taskId) return false;
    
    try {
      let predecessors: string[] = [];
      if (Array.isArray(t.predecessor)) {
        predecessors = t.predecessor;
      } else if (typeof t.predecessor === 'string') {
        predecessors = JSON.parse(t.predecessor);
      }
      
      return predecessors.some(predStr => {
        const match = predStr.match(/^(.+?)([+-]\d+)?$/);
        if (!match) return false;
        const predTaskId = match[1].trim();
        return predTaskId === taskId || predTaskId === taskHierarchy;
      });
    } catch {
      return false;
    }
  });
};