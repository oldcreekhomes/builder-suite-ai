import { ProjectTask } from '@/hooks/useProjectTasks';

export interface ProjectResource {
  resourceId: string;
  resourceName: string;
  resourceGroup?: string;
}

export interface ProcessedTask {
  task_number: number;
  TaskID: string; // Use UUID directly for simplified system
  TaskName: string;
  StartDate: string;
  EndDate: string;
  Duration: number;
  Progress: number;
  Predecessor: string | null;
  Resources: string | null;
  subtasks?: ProcessedTask[];
  originalTaskId: string;
}

// Helper function to convert resource IDs to names
export const convertResourceIdsToNames = (resourceIds: string[] | string | null, resources: ProjectResource[]): string | null => {
  console.log('=== convertResourceIdsToNames DEBUG START ===');
  console.log('Input resourceIds:', resourceIds);
  console.log('Type of resourceIds:', typeof resourceIds);
  console.log('Available resources:', resources);
  console.log('Resource count:', resources?.length || 0);
  
  if (!resourceIds) {
    console.log('No resource IDs provided, returning null');
    console.log('=== convertResourceIdsToNames DEBUG END ===');
    return null;
  }
  
  // If resourceIds is already a string (names), return it directly
  if (typeof resourceIds === 'string') {
    console.log('Resource IDs is already a string of names, returning directly:', resourceIds);
    console.log('=== convertResourceIdsToNames DEBUG END ===');
    return resourceIds;
  }
  
  // If resourceIds is an empty array, return null
  if (Array.isArray(resourceIds) && resourceIds.length === 0) {
    console.log('Empty array provided, returning null');
    console.log('=== convertResourceIdsToNames DEBUG END ===');
    return null;
  }
  
  // Convert array of IDs to names
  const resourceNames: string[] = [];
  resourceIds.forEach(id => {
    console.log(`Looking for resource with ID: "${id}"`);
    const resource = resources.find(r => r.resourceId === id);
    if (resource) {
      console.log(`Found matching resource: ${resource.resourceName} (ID: ${resource.resourceId})`);
      resourceNames.push(resource.resourceName);
    } else {
      console.log(`NO MATCH FOUND for resource ID: "${id}"`);
      console.log('Available resource IDs:', resources.map(r => ({ id: r.resourceId, name: r.resourceName })));
    }
  });
  
  const result = resourceNames.length > 0 ? resourceNames.join(',') : null;
  console.log('Final result:', result);
  console.log('=== convertResourceIdsToNames DEBUG END ===');
  return result;
};

// Generate nested hierarchy using parent_id relationships
export const generateNestedHierarchy = (tasks: ProjectTask[], resources: ProjectResource[] = []): ProcessedTask[] => {
  console.log('=== GENERATE NESTED HIERARCHY (SIMPLIFIED) ===');
  console.log('Input tasks:', tasks);
  
  // Create a map for quick lookup
  const taskMap = new Map<string, ProjectTask>(tasks.map(task => [task.id, task]));
  const processedMap = new Map<string, ProcessedTask>();
  
  // Convert all tasks to ProcessedTask format first
  const processedTasks: ProcessedTask[] = tasks.map(task => ({
    task_number: task.task_number,
    TaskID: task.id, // Use UUID directly
    TaskName: task.task_name,
    StartDate: task.start_date,
    EndDate: task.end_date,
    Duration: task.duration,
    Progress: task.progress,
    Predecessor: task.predecessor,
    Resources: convertResourceIdsToNames(task.resources, resources),
    subtasks: [],
    originalTaskId: task.id,
  }));
  
  // Create lookup map for processed tasks
  processedTasks.forEach(task => processedMap.set(task.originalTaskId, task));
  
  // Build hierarchy using parent_id relationships
  const rootTasks: ProcessedTask[] = [];
  
  tasks.forEach(task => {
    const processedTask = processedMap.get(task.id);
    if (!processedTask) return;
    
    if (task.parent_id && taskMap.has(task.parent_id)) {
      // Task has a parent - add to parent's subtasks
      const parentTask = processedMap.get(task.parent_id);
      if (parentTask) {
        if (!parentTask.subtasks) {
          parentTask.subtasks = [];
        }
        parentTask.subtasks.push(processedTask);
      }
    } else {
      // Root-level task
      rootTasks.push(processedTask);
    }
  });
  
  console.log('Generated hierarchy:', rootTasks);
  console.log('=== GENERATE NESTED HIERARCHY END ===');
  
  return rootTasks;
};

// Helper function to find original task ID from UUID (simplified)
export const findOriginalTaskId = (taskId: string, processedTasks: ProcessedTask[]): string | null => {
  console.log(`Finding original task ID for: ${taskId}`);
  
  const findInTasks = (tasks: ProcessedTask[]): string | null => {
    for (const task of tasks) {
      if (task.TaskID === taskId || task.originalTaskId === taskId) {
        console.log(`Found match! TaskID: ${taskId} -> Original: ${task.originalTaskId}`);
        return task.originalTaskId;
      }
      if (task.subtasks) {
        const found = findInTasks(task.subtasks);
        if (found) return found;
      }
    }
    return null;
  };
  
  const result = findInTasks(processedTasks);
  console.log(`Original task ID search result: ${taskId} -> ${result}`);
  return result;
};

// Convert nested hierarchy back to flat array for database operations
export const flattenHierarchy = (nestedTasks: ProcessedTask[]): ProjectTask[] => {
  console.log('Flattening hierarchy for database storage:', nestedTasks);
  const flatTasks: ProjectTask[] = [];
  
  const flattenRecursive = (tasks: ProcessedTask[], parentId: string | null = null) => {
    tasks.forEach((task, index) => {
      const flatTask: ProjectTask = {
        id: task.originalTaskId,
        project_id: task.TaskID, // This should be set properly
        task_name: task.TaskName,
        start_date: task.StartDate,
        end_date: task.EndDate,
        duration: task.Duration,
        progress: task.Progress,
        predecessor: task.Predecessor,
        resources: task.Resources,
        parent_id: parentId, // Use UUID-based parent relationship
        order_index: index,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        task_number: task.task_number,
      };
      
      console.log(`Flattened task: ${task.TaskName} -> parent_id: ${parentId}`);
      flatTasks.push(flatTask);
      
      if (task.subtasks && task.subtasks.length > 0) {
        flattenRecursive(task.subtasks, task.originalTaskId);
      }
    });
  };
  
  flattenRecursive(nestedTasks);
  console.log('Flattened tasks result:', flatTasks);
  return flatTasks;
};

// Main function to generate hierarchical IDs from flat task array (legacy support)
export const generateHierarchicalIds = (tasks: ProjectTask[]): ProcessedTask[] => {
  const nested = generateNestedHierarchy(tasks);
  return flattenNestedForDisplay(nested);
};

// Helper to flatten nested structure while keeping hierarchical IDs for display
export const flattenNestedForDisplay = (nestedTasks: ProcessedTask[]): ProcessedTask[] => {
  const flattened: ProcessedTask[] = [];
  
  const flattenRecursive = (tasks: ProcessedTask[]) => {
    tasks.forEach(task => {
      flattened.push(task);
      if (task.subtasks && task.subtasks.length > 0) {
        flattenRecursive(task.subtasks);
      }
    });
  };
  
  flattenRecursive(nestedTasks);
  return flattened;
};

// Helper function to regenerate hierarchical IDs after CRUD operations
export const regenerateHierarchicalIds = (tasks: ProjectTask[]): ProcessedTask[] => {
  return generateNestedHierarchy(tasks);
};
