import { ProjectTask } from '@/hooks/useProjectTasks';

export interface ProjectResource {
  resourceId: string;
  resourceName: string;
  resourceGroup?: string;
}

export interface ProcessedTask {
  TaskID: string; // Hierarchical ID for Gantt (e.g., "1", "1.1", "1.2")
  OriginalTaskID: string; // Original UUID from database
  project_id: string;
  task_name: string;
  TaskName: string; // For Gantt component
  StartDate: Date;
  EndDate: Date;
  Duration: number;
  Progress: number;
  Predecessor: string | null;
  Resources: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  subtasks?: ProcessedTask[]; // Nested children
}

// Convert resource names to IDs for database storage
export const convertResourceNamesToIds = (resourceString: string | null, resources: ProjectResource[]): string[] | null => {
  if (!resourceString || !resources?.length) return null;
  
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

// Convert resource IDs to names for display
export const convertResourceIdsToNames = (resourceIds: string[] | string | null, resources: ProjectResource[]): string | null => {
  if (!resourceIds || !resources?.length) return null;
  
  // Handle both array and string inputs
  const idsArray = Array.isArray(resourceIds) ? resourceIds : [resourceIds];
  const resourceNames: string[] = [];
  
  idsArray.forEach(id => {
    const resource = resources.find(r => r.resourceId === id);
    if (resource) {
      resourceNames.push(resource.resourceName);
    }
  });
  
  return resourceNames.length > 0 ? resourceNames.join(', ') : null;
};

// Simple nested hierarchy generation using parent_id UUIDs
export const generateNestedHierarchy = (tasks: ProjectTask[], resources: ProjectResource[] = []): ProcessedTask[] => {
  console.log('=== GENERATE NESTED HIERARCHY START ===');
  console.log('Input tasks:', tasks);
  console.log('Input resources:', resources);
  
  if (!tasks || tasks.length === 0) {
    console.log('No tasks provided, returning empty array');
    return [];
  }

  // Build children map using parent_id (UUID)
  const childrenMap = new Map<string, ProjectTask[]>();
  const rootTasks: ProjectTask[] = [];

  tasks.forEach(task => {
    if (!task.parent_id) {
      rootTasks.push(task);
      console.log(`Root task: ${task.task_name} (${task.id})`);
    } else {
      if (!childrenMap.has(task.parent_id)) {
        childrenMap.set(task.parent_id, []);
      }
      childrenMap.get(task.parent_id)!.push(task);
      console.log(`Child task: ${task.task_name} (${task.id}) -> parent: ${task.parent_id}`);
    }
  });

  // Sort tasks by order_index
  rootTasks.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  childrenMap.forEach(children => {
    children.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  });

  // Recursively process tasks to create hierarchical structure
  const processTasksRecursive = (taskList: ProjectTask[], parentId: string = '', depth: number = 0): ProcessedTask[] => {
    return taskList.map((task, index) => {
      const hierarchicalId = parentId ? `${parentId}.${index + 1}` : `${index + 1}`;
      
      const processedTask: ProcessedTask = {
        TaskID: hierarchicalId,
        OriginalTaskID: task.id,
        project_id: task.project_id,
        task_name: task.task_name,
        TaskName: task.task_name,
        StartDate: new Date(task.start_date),
        EndDate: new Date(task.end_date),
        Duration: task.duration,
        Progress: task.progress,
        Predecessor: task.predecessor,
        Resources: convertResourceIdsToNames(task.resources?.split(',') || null, resources),
        order_index: task.order_index,
        created_at: task.created_at,
        updated_at: task.updated_at,
        subtasks: []
      };

      // Add children if they exist
      const children = childrenMap.get(task.id) || [];
      if (children.length > 0) {
        processedTask.subtasks = processTasksRecursive(children, hierarchicalId, depth + 1);
      }

      return processedTask;
    });
  };

  const result = processTasksRecursive(rootTasks);
  console.log('Generated nested hierarchy:', result);
  console.log('=== GENERATE NESTED HIERARCHY END ===');
  
  return result;
};

// Find the original UUID from a hierarchical ID
export const findOriginalTaskId = (hierarchicalId: string, processedTasks: ProcessedTask[]): string | null => {
  const findInTasks = (tasks: ProcessedTask[]): string | null => {
    for (const task of tasks) {
      if (task.TaskID === hierarchicalId) {
        return task.OriginalTaskID;
      }
      if (task.subtasks && task.subtasks.length > 0) {
        const found = findInTasks(task.subtasks);
        if (found) return found;
      }
    }
    return null;
  };
  
  return findInTasks(processedTasks);
};

// Legacy function for compatibility
export const generateHierarchicalIds = (tasks: ProjectTask[]): ProcessedTask[] => {
  return generateNestedHierarchy(tasks);
};

// Legacy function for compatibility  
export const regenerateHierarchicalIds = (tasks: ProjectTask[]): ProcessedTask[] => {
  return generateNestedHierarchy(tasks);
};

// Flatten hierarchy back to flat array for database operations
export const flattenHierarchy = (nestedTasks: ProcessedTask[]): ProjectTask[] => {
  const flatTasks: ProjectTask[] = [];
  
  const flatten = (tasks: ProcessedTask[], parentId: string | null = null) => {
    tasks.forEach(task => {
      flatTasks.push({
        id: task.OriginalTaskID,
        project_id: task.project_id,
        task_name: task.task_name,
        start_date: task.StartDate.toISOString(),
        end_date: task.EndDate.toISOString(),
        duration: task.Duration,
        progress: task.Progress,
        predecessor: task.Predecessor,
        resources: task.Resources,
        parent_id: parentId,
        order_index: task.order_index,
        created_at: task.created_at,
        updated_at: task.updated_at,
      });
      
      if (task.subtasks && task.subtasks.length > 0) {
        flatten(task.subtasks, task.OriginalTaskID);
      }
    });
  };
  
  flatten(nestedTasks);
  return flatTasks;
};