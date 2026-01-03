import { ProjectTask } from "@/hooks/useProjectTasks";
import { 
  getBusinessDaysBetween, 
  calculateBusinessEndDate, 
  addBusinessDays, 
  isBusinessDay, 
  ensureBusinessDay, 
  getNextBusinessDay, 
  normalizeToYMD,
  DateString
} from "./dateOnly";
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

export const calculateParentTaskValues = (parentTask: ProjectTask, allTasks: ProjectTask[]): TaskCalculations | null => {
  const childTasks = getAllDescendantTasks(parentTask, allTasks);
  
  if (childTasks.length === 0) {
    return null;
  }
  
  // Convert all dates to YYYY-MM-DD strings and find min/max
  const startDates = childTasks.map(task => normalizeToYMD(task.start_date));
  const endDates = childTasks.map(task => normalizeToYMD(task.end_date));
  
  // String comparison works for YYYY-MM-DD format
  const earliestStartDate = startDates.reduce((min, date) => date < min ? date : min);
  const latestEndDate = endDates.reduce((max, date) => date > max ? date : max);
  
  // Calculate duration as sum of all child durations (not date span)
  const duration = childTasks.reduce((sum, task) => sum + task.duration, 0);
  
  console.log('🔢 Parent calculation debug:', {
    childTasks: childTasks.map(t => ({ name: t.task_name, start: normalizeToYMD(t.start_date), end: normalizeToYMD(t.end_date), duration: t.duration })),
    earliestStartDate,
    latestEndDate,
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
    startDate: earliestStartDate,
    endDate: latestEndDate,
    duration,
    progress: progressPercentage
  };
};

export const shouldUpdateParentTask = (task: ProjectTask, calculations: TaskCalculations): boolean => {
  return (
    normalizeToYMD(task.start_date) !== calculations.startDate ||
    normalizeToYMD(task.end_date) !== calculations.endDate ||
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
// Supports FS, SF, SS, and FF relationships
export const calculateTaskDatesFromPredecessors = (
  task: ProjectTask, 
  allTasks: ProjectTask[]
): TaskDateUpdate | null => {
  if (!task.predecessor) return null;
  
  // Parse predecessors
  const predecessors = safeParsePredecessors(task.predecessor);
  
  if (predecessors.length === 0) return null;
  
  let latestFSEndDate: DateString | null = null;
  let earliestSFEndDate: DateString | null = null;
  let latestSSStartDate: DateString | null = null;
  let latestFFEndDate: DateString | null = null;
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
      hasSFPredecessor = true;
      
      const predStartDate = normalizeToYMD(predTask.start_date);
      
      // End date = predecessor start - 1 business day + lag
      const taskEndDate = addBusinessDays(predStartDate, -1 + lagDays);
      
      if (!earliestSFEndDate || taskEndDate < earliestSFEndDate) {
        earliestSFEndDate = taskEndDate;
      }
    } else if (linkType === 'SS') {
      // SS (Start-to-Start): Task's START = predecessor's START (+ lag)
      hasSSPredecessor = true;
      
      const predStartDate = normalizeToYMD(predTask.start_date);
      
      // Start date = predecessor start + lag (EXACT same day if lag=0)
      const taskStartDate = addBusinessDays(predStartDate, lagDays);
      
      if (!latestSSStartDate || taskStartDate > latestSSStartDate) {
        latestSSStartDate = taskStartDate;
      }
    } else if (linkType === 'FF') {
      // FF (Finish-to-Finish): Task's END = predecessor's END (+ lag)
      hasFFPredecessor = true;
      
      const predEndDate = normalizeToYMD(predTask.end_date);
      
      // End date = predecessor end + lag (EXACT same day if lag=0)
      const taskEndDate = addBusinessDays(predEndDate, lagDays);
      
      if (!latestFFEndDate || taskEndDate > latestFFEndDate) {
        latestFFEndDate = taskEndDate;
      }
    } else {
      // FS (Finish-to-Start): Task's START is after predecessor's END
      hasFSPredecessor = true;
      
      const predEndDate = normalizeToYMD(predTask.end_date);
      
      // Apply lag using business days
      const adjustedPredEndDate = addBusinessDays(predEndDate, lagDays);
      
      if (!latestFSEndDate || adjustedPredEndDate > latestFSEndDate) {
        latestFSEndDate = adjustedPredEndDate;
      }
    }
  }
  
  // Handle SF predecessors (backward calculation from end date)
  if (hasSFPredecessor && earliestSFEndDate) {
    const newEndDate = earliestSFEndDate;
    const newStartDate = addBusinessDays(newEndDate, -(task.duration - 1));
    
    console.log('📅 SF calculation:', {
      taskName: task.task_name,
      duration: task.duration,
      newEndDate,
      newStartDate
    });
    
    return {
      startDate: newStartDate,
      endDate: newEndDate,
      duration: task.duration
    };
  }
  
  // Handle SS predecessors (task starts on EXACT same day as predecessor starts)
  if (hasSSPredecessor && latestSSStartDate) {
    const newStartDate = latestSSStartDate;
    const newEndDate = calculateBusinessEndDate(newStartDate, task.duration);
    
    console.log('📅 SS calculation:', {
      taskName: task.task_name,
      duration: task.duration,
      newStartDate,
      newEndDate
    });
    
    return {
      startDate: newStartDate,
      endDate: newEndDate,
      duration: task.duration
    };
  }
  
  // Handle FF predecessors (task ends on EXACT same day as predecessor ends)
  if (hasFFPredecessor && latestFFEndDate) {
    const newEndDate = latestFFEndDate;
    const newStartDate = addBusinessDays(newEndDate, -(task.duration - 1));
    
    console.log('📅 FF calculation:', {
      taskName: task.task_name,
      duration: task.duration,
      newEndDate,
      newStartDate
    });
    
    return {
      startDate: newStartDate,
      endDate: newEndDate,
      duration: task.duration
    };
  }
  
  // Handle FS predecessors (forward calculation from start date)
  if (hasFSPredecessor && latestFSEndDate) {
    const newStartDate = getNextBusinessDay(latestFSEndDate);
    const newEndDate = calculateBusinessEndDate(newStartDate, task.duration);
    
    return {
      startDate: newStartDate,
      endDate: newEndDate,
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
