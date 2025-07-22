import { ProjectTask } from '@/hooks/useProjectTasks';

export interface ProcessedTask extends Omit<ProjectTask, 'id'> {
  TaskID: string; // Hierarchical ID like "1", "1.1", "1.2"
  OriginalTaskID: string; // Original UUID from database
  TaskName: string;
  StartDate: Date;
  EndDate: Date;
  Duration: number;
  Progress: number;
  Predecessor: string | null;
  Resources: string | null;
  subtasks?: ProcessedTask[]; // Nested children instead of ParentID
  OrderIndex: number;
}

// Convert flat array to nested hierarchy with hierarchical IDs
export const generateNestedHierarchy = (tasks: ProjectTask[]): ProcessedTask[] => {
  if (!tasks || tasks.length === 0) return [];

  // First, create a map of tasks by their UUID
  const taskMap = new Map<string, ProjectTask>();
  tasks.forEach(task => taskMap.set(task.id, task));

  // Build the nested structure
  const rootTasks: ProjectTask[] = [];
  const childrenMap = new Map<string, ProjectTask[]>();

  // Separate root tasks and build children map
  tasks.forEach(task => {
    if (!task.parent_id) {
      rootTasks.push(task);
    } else {
      if (!childrenMap.has(task.parent_id)) {
        childrenMap.set(task.parent_id, []);
      }
      childrenMap.get(task.parent_id)!.push(task);
    }
  });

  // Sort all tasks by order_index
  rootTasks.sort((a, b) => a.order_index - b.order_index);
  childrenMap.forEach(children => {
    children.sort((a, b) => a.order_index - b.order_index);
  });

  // Recursively process tasks to create hierarchical structure
  const processTasksRecursive = (taskList: ProjectTask[], parentId: string = ''): ProcessedTask[] => {
    return taskList.map((task, index) => {
      const hierarchicalId = parentId ? `${parentId}.${index + 1}` : `${index + 1}`;
      
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
        Resources: task.resources,
        parent_id: task.parent_id,
        order_index: task.order_index,
        OrderIndex: task.order_index,
        created_at: task.created_at,
        updated_at: task.updated_at,
      };

      // Process children if they exist
      const children = childrenMap.get(task.id) || [];
      if (children.length > 0) {
        processedTask.subtasks = processTasksRecursive(children, hierarchicalId);
      }

      return processedTask;
    });
  };

  return processTasksRecursive(rootTasks);
};

// Helper function to find original task ID from hierarchical ID
export const findOriginalTaskId = (hierarchicalId: string, processedTasks: ProcessedTask[]): string | null => {
  const findInTasks = (tasks: ProcessedTask[]): string | null => {
    for (const task of tasks) {
      if (task.TaskID === hierarchicalId) {
        return task.OriginalTaskID;
      }
      if (task.subtasks) {
        const found = findInTasks(task.subtasks);
        if (found) return found;
      }
    }
    return null;
  };
  
  return findInTasks(processedTasks);
};

// Convert nested hierarchy back to flat array for database operations
export const flattenHierarchy = (nestedTasks: ProcessedTask[]): ProjectTask[] => {
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
      };
      
      flatTasks.push(flatTask);
      
      if (task.subtasks && task.subtasks.length > 0) {
        flattenRecursive(task.subtasks, task.OriginalTaskID);
      }
    });
  };
  
  flattenRecursive(nestedTasks);
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
