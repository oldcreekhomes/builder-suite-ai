import { ProjectTask } from "@/hooks/useProjectTasks";
import { getBusinessDaysBetween, calculateBusinessEndDate, addBusinessDays, isBusinessDay, ensureBusinessDay, getNextBusinessDay, formatYMD, startOfLocalDay } from "./businessDays";
import { safeParsePredecessors } from "./predecessorValidation";

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

// Helper function to parse ISO date strings as local calendar dates (ignoring timezone)
function toLocalDate(isoDateString: string): Date {
  const dateOnly = isoDateString.split('T')[0]; // Get YYYY-MM-DD part
  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed in Date constructor
}

export const calculateParentTaskValues = (parentTask: ProjectTask, allTasks: ProjectTask[]): TaskCalculations | null => {
  const childTasks = getAllDescendantTasks(parentTask, allTasks);
  
  if (childTasks.length === 0) {
    return null;
  }
  
  // Calculate start date (earliest start date among children) using local date parsing
  const startDates = childTasks.map(task => toLocalDate(task.start_date));
  const earliestStartDate = new Date(Math.min(...startDates.map(date => date.getTime())));
  
  // Calculate end date (latest end date among children) using local date parsing
  const endDates = childTasks.map(task => toLocalDate(task.end_date));
  const latestEndDate = new Date(Math.max(...endDates.map(date => date.getTime())));
  
  // Calculate duration as sum of all child durations (not date span)
  const duration = childTasks.reduce((sum, task) => sum + task.duration, 0);
  
  console.log('🔢 Parent calculation debug:', {
    childTasks: childTasks.map(t => ({ name: t.task_name, start: t.start_date.split('T')[0], end: t.end_date.split('T')[0], duration: t.duration })),
    earliestStartDate: formatYMD(earliestStartDate),
    latestEndDate: formatYMD(latestEndDate),
    calculatedDuration: duration
  });
  
  // Calculate progress based on completed duration vs total duration
  const totalDuration = childTasks.reduce((sum, task) => sum + task.duration, 0);
  const completedDuration = childTasks.reduce((sum, task) => {
    const taskProgress = (task.progress || 0) / 100; // Convert percentage to decimal
    return sum + (task.duration * taskProgress);
  }, 0);
  const progressPercentage = totalDuration > 0 ? Math.round((completedDuration / totalDuration) * 100) : 0;
  
  return {
    startDate: formatYMD(earliestStartDate), // Format as YYYY-MM-DD
    endDate: formatYMD(latestEndDate),
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
  const predecessors = safeParsePredecessors(task.predecessor);
  
  if (predecessors.length === 0) return null;
  
  let latestEndDate = new Date(0); // Start with earliest possible date
  
  // Find the latest end date among all predecessors
  for (const predStr of predecessors) {
    // Parse predecessor format: "taskId" or "taskId+Nd" or "taskId-Nd"
    const match = predStr.trim().match(/^(.+?)([+-]\d+d?)?$/);
    if (!match) continue;
    
    const predTaskId = match[1].trim();
    // Extract lag days, handling both "+3d"/"-2d" and "+3"/"-2" formats
    let lagDays = 0;
    if (match[2]) {
      const lagStr = match[2].endsWith('d') ? match[2].slice(0, -1) : match[2];
      lagDays = parseInt(lagStr) || 0;
    }
    
    // Find the predecessor task by hierarchy number or ID
    const predTask = allTasks.find(t => 
      t.hierarchy_number === predTaskId || t.id === predTaskId
    );
    
    if (!predTask) continue;
    
    // Get the end date as YYYY-MM-DD string and parse as local date
    const predEndDateStr = predTask.end_date.split('T')[0]; // Get YYYY-MM-DD part
    const [year, month, day] = predEndDateStr.split('-').map(Number);
    const predEndDate = new Date(year, month - 1, day); // Create local date
    
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
  const newStartDate = getNextBusinessDay(latestEndDate);
  
  // Calculate new end date based on task duration using business days
  const newEndDate = calculateBusinessEndDate(newStartDate, task.duration);
  
  return {
    startDate: formatYMD(newStartDate), // Returns YYYY-MM-DD format
    endDate: formatYMD(newEndDate),
    duration: task.duration
  };
};

// Get all tasks that depend on a given task (have it as predecessor)
export const getDependentTasks = (taskId: string, allTasks: ProjectTask[]): ProjectTask[] => {
  console.log(`🔍 Finding tasks dependent on task ID: ${taskId}`);
  
  const task = allTasks.find(t => t.id === taskId);
  if (!task) {
    console.log(`❌ Task with ID ${taskId} not found`);
    return [];
  }
  
  const taskHierarchy = task.hierarchy_number;
  console.log(`📋 Task hierarchy: ${taskHierarchy}, Task name: ${task.task_name}`);
  
  const dependentTasks = allTasks.filter(t => {
    if (!t.predecessor || t.id === taskId) return false;
    
    try {
      const predecessors = safeParsePredecessors(t.predecessor);
      
      const isDependent = predecessors.some(predStr => {
        // Parse predecessor format: "taskId" or "taskId+Nd" or "taskId-Nd"
        const match = predStr.trim().match(/^(.+?)([+-]\d+d?)?$/);
        if (!match) return false;
        const predTaskId = match[1].trim();
        return predTaskId === taskId || predTaskId === taskHierarchy;
      });
      
      if (isDependent) {
        console.log(`📌 Found dependent task: ${t.task_name} (ID: ${t.id}) with predecessors: ${JSON.stringify(predecessors)}`);
      }
      
      return isDependent;
    } catch (error) {
      console.log(`❌ Error parsing predecessors for task ${t.task_name}:`, error);
      return false;
    }
  });
  
  console.log(`✅ Total dependent tasks found: ${dependentTasks.length}`);
  return dependentTasks;
};