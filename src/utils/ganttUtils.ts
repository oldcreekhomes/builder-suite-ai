
import { ProjectTask } from '@/hooks/useProjectTasks';

export interface ProjectResource {
  resourceId: string;
  resourceName: string;
  resourceGroup?: string;
  type?: string;
}

export interface ProcessedTask extends Omit<ProjectTask, 'id'> {
  TaskID: string; // Hierarchical ID like "1", "1.1", "1.2"
  OriginalTaskID: string; // Original UUID from database
  TaskName: string;
  StartDate: Date;
  EndDate: Date;
  Duration: number;
  Progress: number;
  Predecessor: string | null;
  Resources: string[] | null; // Array of resource IDs for Syncfusion
  subtasks?: ProcessedTask[]; // Nested children instead of ParentID
  OrderIndex: number;
  Confirmed: boolean | null; // Add confirmed status for conditional styling
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

// Convert flat array to nested hierarchy with hierarchical IDs and comprehensive debugging
export const generateNestedHierarchy = (tasks: ProjectTask[], resources: ProjectResource[] = []): ProcessedTask[] => {
  console.log('=== GENERATE NESTED HIERARCHY START ===');
  console.log('Input tasks:', tasks);
  
  if (!tasks || tasks.length === 0) {
    console.log('No tasks to process, returning empty array');
    return [];
  }

  // First, create a map of tasks by their UUID
  const taskMap = new Map<string, ProjectTask>();
  tasks.forEach(task => {
    taskMap.set(task.id, task);
    console.log(`Task mapped: ${task.id} -> ${task.task_name} (parent: ${task.parent_id})`);
  });

  // Build the nested structure
  const rootTasks: ProjectTask[] = [];
  const childrenMap = new Map<string, ProjectTask[]>();

  // Separate root tasks and build children map with enhanced logic
  tasks.forEach(task => {
    // Treat tasks with no parent_id OR self-referencing parent_id as root tasks
    if (!task.parent_id || task.parent_id === task.id) {
      rootTasks.push(task);
      console.log(`Root task identified: ${task.task_name} (${task.id}) - parent_id: ${task.parent_id}`);
    } else {
      if (!childrenMap.has(task.parent_id)) {
        childrenMap.set(task.parent_id, []);
      }
      childrenMap.get(task.parent_id)!.push(task);
      console.log(`Child task mapped: ${task.task_name} (${task.id}) -> parent: ${task.parent_id}`);
    }
  });

  console.log('Root tasks count:', rootTasks.length);
  console.log('Children map:', Object.fromEntries(childrenMap));

  // Sort all tasks by order_index to maintain proper hierarchy
  rootTasks.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  childrenMap.forEach(children => {
    children.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  });

  // Recursively process tasks to create hierarchical structure
  const processTasksRecursive = (taskList: ProjectTask[], parentId: string = '', depth: number = 0): ProcessedTask[] => {
    console.log(`Processing ${taskList.length} tasks at depth ${depth}, parent: ${parentId}`);
    
    return taskList.map((task, index) => {
      const hierarchicalId = parentId ? `${parentId}.${index + 1}` : `${index + 1}`;
      console.log(`Creating hierarchical ID: ${hierarchicalId} for task: ${task.task_name}`);
      
      const processedTask: ProcessedTask = {
        TaskID: hierarchicalId,
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
        parent_id: task.parent_id,
        order_index: task.order_index,
        OrderIndex: task.order_index,
        created_at: task.created_at,
        updated_at: task.updated_at,
        confirmed: task.confirmed,
        Confirmed: task.confirmed,
      };

      // Process children if they exist
      const children = childrenMap.get(task.id) || [];
      if (children.length > 0) {
        console.log(`Processing ${children.length} children for task: ${task.task_name}`);
        processedTask.subtasks = processTasksRecursive(children, hierarchicalId, depth + 1);
      }

      return processedTask;
    });
  };

  const result = processTasksRecursive(rootTasks);
  console.log('=== GENERATE NESTED HIERARCHY RESULT ===');
  console.log('Final hierarchical structure:', result);
  console.log('=== GENERATE NESTED HIERARCHY END ===');
  
  return result;
};

// Helper function to find original task ID from hierarchical ID with debugging
export const findOriginalTaskId = (hierarchicalId: string, processedTasks: ProcessedTask[]): string | null => {
  console.log(`Finding original task ID for hierarchical ID: ${hierarchicalId}`);
  
  const findInTasks = (tasks: ProcessedTask[]): string | null => {
    for (const task of tasks) {
      console.log(`Checking task: ${task.TaskID} (original: ${task.OriginalTaskID})`);
      if (task.TaskID === hierarchicalId) {
        console.log(`Found match! Hierarchical: ${hierarchicalId} -> Original: ${task.OriginalTaskID}`);
        return task.OriginalTaskID;
      }
      if (task.subtasks) {
        const found = findInTasks(task.subtasks);
        if (found) return found;
      }
    }
    return null;
  };
  
  const result = findInTasks(processedTasks);
  console.log(`Original task ID search result: ${hierarchicalId} -> ${result}`);
  return result;
};

// Convert nested hierarchy back to flat array for database operations
export const flattenHierarchy = (nestedTasks: ProcessedTask[]): ProjectTask[] => {
  console.log('Flattening hierarchy for database storage:', nestedTasks);
  const flatTasks: ProjectTask[] = [];
  
  const flattenRecursive = (tasks: ProcessedTask[], parentOriginalId: string | null = null) => {
    tasks.forEach((task, index) => {
      const flatTask: ProjectTask = {
        id: task.OriginalTaskID,
        project_id: task.project_id,
        task_name: task.task_name,
        start_date: task.start_date,
        end_date: task.end_date,
        duration: task.duration,
        progress: task.progress,
        predecessor: task.predecessor,
        resources: task.resources,
        parent_id: parentOriginalId,
        order_index: index,
        created_at: task.created_at,
        updated_at: task.updated_at,
        confirmed: task.confirmed,
      };
      
      console.log(`Flattened task: ${task.task_name} -> parent_id: ${parentOriginalId}`);
      flatTasks.push(flatTask);
      
      if (task.subtasks && task.subtasks.length > 0) {
        flattenRecursive(task.subtasks, task.OriginalTaskID);
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
const flattenNestedForDisplay = (nestedTasks: ProcessedTask[]): ProcessedTask[] => {
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
