import { ProjectTask } from "@/hooks/useProjectTasks";
import { getBusinessDaysBetween, calculateBusinessEndDate, addBusinessDays, isBusinessDay, ensureBusinessDay, getNextBusinessDay, formatYMD, startOfLocalDay } from "./businessDays";
import { safeParsePredecessors, parsePredecessorString } from "./predecessorValidation";

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
// Supports both FS (Finish-to-Start) and SF (Start-to-Finish) relationships
export const calculateTaskDatesFromPredecessors = (
  task: ProjectTask, 
  allTasks: ProjectTask[]
): TaskDateUpdate | null => {
  if (!task.predecessor) return null;
  
  // Parse predecessors
  const predecessors = safeParsePredecessors(task.predecessor);
  
  if (predecessors.length === 0) return null;
  
  let latestFSEndDate = new Date(0); // For FS predecessors - track latest end date
  let earliestSFEndDate: Date | null = null; // For SF predecessors - track earliest constrained end date
  let latestSSStartDate = new Date(0); // For SS predecessors - track latest start date
  let latestFFEndDate = new Date(0); // For FF predecessors - track latest end date
  let hasFSPredecessor = false;
  let hasSFPredecessor = false;
  let hasSSPredecessor = false;
  let hasFFPredecessor = false;
  
  // Process all predecessors
  for (const predStr of predecessors) {
    const parsed = parsePredecessorString(predStr);
    if (!parsed) continue;
    
    const { taskId: predTaskId, linkType, lagDays } = parsed;
    
    // Find the predecessor task by hierarchy number or ID
    const predTask = allTasks.find(t => 
      t.hierarchy_number === predTaskId || t.id === predTaskId
    );
    
    if (!predTask) continue;
    
    if (linkType === 'SF') {
      // SF (Start-to-Finish): Task's END is relative to predecessor's START
      // Task end = predecessor start - 1 + lag
      hasSFPredecessor = true;
      
      const predStartDateStr = predTask.start_date.split('T')[0];
      const [year, month, day] = predStartDateStr.split('-').map(Number);
      const predStartDate = new Date(year, month - 1, day);
      
      // End date = predecessor start - 1 business day + lag
      // With lag=0: end is 1 business day before predecessor starts
      // With lag=-1: end is 2 business days before predecessor starts
      // With lag=+1: end is same day as predecessor starts
      const taskEndDate = addBusinessDays(predStartDate, -1 + lagDays);
      
      if (!earliestSFEndDate || taskEndDate < earliestSFEndDate) {
        earliestSFEndDate = taskEndDate;
      }
    } else if (linkType === 'SS') {
      // SS (Start-to-Start): Task's START = predecessor's START (+ lag)
      // Task starts on EXACT same day as predecessor starts
      hasSSPredecessor = true;
      
      const predStartDateStr = predTask.start_date.split('T')[0];
      const [year, month, day] = predStartDateStr.split('-').map(Number);
      const predStartDate = new Date(year, month - 1, day);
      
      // Start date = predecessor start + lag (EXACT same day if lag=0)
      const taskStartDate = addBusinessDays(predStartDate, lagDays);
      
      if (taskStartDate > latestSSStartDate) {
        latestSSStartDate = taskStartDate;
      }
    } else if (linkType === 'FF') {
      // FF (Finish-to-Finish): Task's END = predecessor's END (+ lag)
      // Task ends on EXACT same day as predecessor ends
      hasFFPredecessor = true;
      
      const predEndDateStr = predTask.end_date.split('T')[0];
      const [year, month, day] = predEndDateStr.split('-').map(Number);
      const predEndDate = new Date(year, month - 1, day);
      
      // End date = predecessor end + lag (EXACT same day if lag=0)
      const taskEndDate = addBusinessDays(predEndDate, lagDays);
      
      if (taskEndDate > latestFFEndDate) {
        latestFFEndDate = taskEndDate;
      }
    } else {
      // FS (Finish-to-Start): Task's START is after predecessor's END
      hasFSPredecessor = true;
      
      const predEndDateStr = predTask.end_date.split('T')[0];
      const [year, month, day] = predEndDateStr.split('-').map(Number);
      const predEndDate = new Date(year, month - 1, day);
      
      // Apply lag using business days
      const adjustedPredEndDate = addBusinessDays(predEndDate, lagDays);
      
      if (adjustedPredEndDate > latestFSEndDate) {
        latestFSEndDate = adjustedPredEndDate;
      }
    }
  }
  
  // Handle SF predecessors (backward calculation from end date)
  if (hasSFPredecessor && earliestSFEndDate) {
    // Calculate start date by going backward from end date by duration
    // Duration of N means N business days, so start = end - (duration - 1) business days
    const newEndDate = earliestSFEndDate;
    const newStartDate = addBusinessDays(newEndDate, -(task.duration - 1));
    
    console.log('📅 SF calculation:', {
      taskName: task.task_name,
      duration: task.duration,
      newEndDate: formatYMD(newEndDate),
      newStartDate: formatYMD(newStartDate)
    });
    
    return {
      startDate: formatYMD(newStartDate),
      endDate: formatYMD(newEndDate),
      duration: task.duration
    };
  }
  
  // Handle SS predecessors (task starts on EXACT same day as predecessor starts)
  if (hasSSPredecessor && latestSSStartDate.getTime() !== 0) {
    const newStartDate = latestSSStartDate; // EXACT same day
    const newEndDate = calculateBusinessEndDate(newStartDate, task.duration);
    
    console.log('📅 SS calculation:', {
      taskName: task.task_name,
      duration: task.duration,
      newStartDate: formatYMD(newStartDate),
      newEndDate: formatYMD(newEndDate)
    });
    
    return {
      startDate: formatYMD(newStartDate),
      endDate: formatYMD(newEndDate),
      duration: task.duration
    };
  }
  
  // Handle FF predecessors (task ends on EXACT same day as predecessor ends)
  if (hasFFPredecessor && latestFFEndDate.getTime() !== 0) {
    const newEndDate = latestFFEndDate; // EXACT same day
    const newStartDate = addBusinessDays(newEndDate, -(task.duration - 1));
    
    console.log('📅 FF calculation:', {
      taskName: task.task_name,
      duration: task.duration,
      newEndDate: formatYMD(newEndDate),
      newStartDate: formatYMD(newStartDate)
    });
    
    return {
      startDate: formatYMD(newStartDate),
      endDate: formatYMD(newEndDate),
      duration: task.duration
    };
  }
  
  // Handle FS predecessors (forward calculation from start date) - existing logic
  if (hasFSPredecessor && latestFSEndDate.getTime() !== 0) {
    // New start date is the next business day after the latest predecessor end date
    const newStartDate = getNextBusinessDay(latestFSEndDate);
    
    // Calculate new end date based on task duration using business days
    const newEndDate = calculateBusinessEndDate(newStartDate, task.duration);
    
    return {
      startDate: formatYMD(newStartDate),
      endDate: formatYMD(newEndDate),
      duration: task.duration
    };
  }
  
  return null;
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
        const parsed = parsePredecessorString(predStr);
        if (!parsed) return false;
        return parsed.taskId === taskId || parsed.taskId === taskHierarchy;
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
