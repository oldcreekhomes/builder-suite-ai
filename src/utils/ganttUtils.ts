import { ProjectTask } from '@/hooks/useProjectTasks';

export interface ProjectResource {
  resourceId: string;
  resourceName: string;
  resourceGroup?: string;
  type?: string;
}

export interface ProcessedTask extends Omit<ProjectTask, 'id'> {
  TaskID: string; // Use hierarchy_number directly as TaskID
  OriginalTaskID: string; // Original UUID from database
  TaskName: string;
  StartDate: Date;
  EndDate: Date;
  Duration: number;
  Progress: number;
  Predecessor: string | null;
  Resources: string[] | null; // Array of resource IDs for Syncfusion
  ParentTaskID?: string; // Parent hierarchy_number for Syncfusion
  Confirmed: boolean | null;
}

// Helper function to convert resource names to IDs
const convertResourceNamesToIds = (resourceString: string | null, resources: ProjectResource[]): string[] | null => {
  if (!resourceString || resourceString.trim() === '') return null;
  
  const resourceNames = resourceString.split(',').map(name => name.trim());
  const resourceIds: string[] = [];
  
  resourceNames.forEach(name => {
    const resource = resources.find(r => r.resourceName === name);
    if (resource) {
      resourceIds.push(resource.resourceId);
    }
  });
  
  return resourceIds.length > 0 ? resourceIds : null;
};

// Helper function to convert resource IDs to names
export const convertResourceIdsToNames = (resourceIds: string[] | string | null, resources: ProjectResource[]): string | null => {
  if (!resourceIds) return null;
  
  // If resourceIds is already a string (names), return it directly
  if (typeof resourceIds === 'string') {
    return resourceIds;
  }
  
  // If resourceIds is an empty array, return null
  if (Array.isArray(resourceIds) && resourceIds.length === 0) {
    return null;
  }
  
  // Convert array of IDs to names
  const resourceNames: string[] = [];
  resourceIds.forEach(id => {
    const resource = resources.find(r => r.resourceId === id);
    if (resource) {
      resourceNames.push(resource.resourceName);
    }
  });
  
  return resourceNames.length > 0 ? resourceNames.join(',') : null;
};

// Convert tasks to format suitable for Syncfusion Gantt
export const transformTasksForGantt = (tasks: ProjectTask[], resources: ProjectResource[] = []): ProcessedTask[] => {
  console.log('🔄 Transforming tasks for Gantt with hierarchy numbers:', tasks);
  
  if (!tasks || tasks.length === 0) {
    console.log('No tasks to transform');
    return [];
  }

  // Sort tasks by hierarchy_number to maintain proper order
  const sortedTasks = [...tasks].sort((a, b) => {
    return a.hierarchy_number.localeCompare(b.hierarchy_number, undefined, { 
      numeric: true, 
      sensitivity: 'base' 
    });
  });

  const processedTasks: ProcessedTask[] = sortedTasks.map(task => {
    // Determine parent by hierarchy number (e.g., "1.2" has parent "1")
    const hierarchyParts = task.hierarchy_number.split('.');
    const parentHierarchy = hierarchyParts.length > 1 
      ? hierarchyParts.slice(0, -1).join('.') 
      : undefined;

    const processedTask: ProcessedTask = {
      TaskID: task.hierarchy_number, // Use hierarchy_number directly as TaskID
      OriginalTaskID: task.id,
      project_id: task.project_id,
      task_name: task.task_name,
      TaskName: task.task_name,
      start_date: task.start_date,
      StartDate: new Date(task.start_date),
      end_date: task.end_date,
      EndDate: new Date(task.end_date),
      duration: task.duration,
      Duration: task.duration,
      progress: task.progress,
      Progress: task.progress,
      predecessor: task.predecessor,
      Predecessor: task.predecessor,
      resources: task.resources,
      Resources: convertResourceNamesToIds(task.resources, resources),
      hierarchy_number: task.hierarchy_number,
      ParentTaskID: parentHierarchy, // Set parent for Syncfusion
      created_at: task.created_at,
      updated_at: task.updated_at,
      confirmed: task.confirmed,
      Confirmed: task.confirmed,
    };
    
    console.log(`Transformed task: ${task.task_name} (${task.hierarchy_number}) -> Parent: ${parentHierarchy}`);
    return processedTask;
  });

  console.log('✅ Task transformation complete:', processedTasks);
  return processedTasks;
};

// Find original task ID from hierarchy number
export const findOriginalTaskId = (hierarchyNumber: string, tasks: ProjectTask[]): string | null => {
  const task = tasks.find(t => t.hierarchy_number === hierarchyNumber);
  return task ? task.id : null;
};

// Calculate new hierarchy number for drag operations
export const calculateNewHierarchyNumber = (
  dropIndex: number, 
  newParentHierarchy: string | null,
  existingTasks: ProjectTask[]
): string => {
  console.log('🧮 Calculating new hierarchy number:', { dropIndex, newParentHierarchy });
  
  // With the new simplified system, we just find the next available sequential number
  // No more complex parent-child hierarchy in the numbers themselves
  const existingNumbers = new Set(
    existingTasks.map(task => parseInt(task.hierarchy_number)).filter(num => !isNaN(num))
  );
  
  let newNumber = 1;
  while (existingNumbers.has(newNumber)) {
    newNumber++;
  }
  
  console.log('📍 New hierarchy number:', newNumber.toString());
  return newNumber.toString();
};

// Generate hierarchy number for new tasks
export const generateNewTaskHierarchy = (tasks: ProjectTask[], parentHierarchy?: string): string => {
  return calculateNewHierarchyNumber(0, parentHierarchy || null, tasks);
};