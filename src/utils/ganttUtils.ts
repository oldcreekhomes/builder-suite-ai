
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
  ParentID: string | null;
  OrderIndex: number;
}

// Build hierarchical structure from flat task array
const buildTaskHierarchy = (tasks: ProjectTask[]): ProjectTask[] => {
  const taskMap = new Map<string, ProjectTask & { children?: ProjectTask[] }>();
  const rootTasks: ProjectTask[] = [];

  // First pass: create task map and initialize children arrays
  tasks.forEach(task => {
    taskMap.set(task.id, { ...task, children: [] });
  });

  // Second pass: build parent-child relationships
  tasks.forEach(task => {
    const taskWithChildren = taskMap.get(task.id)!;
    
    if (task.parent_id) {
      const parent = taskMap.get(task.parent_id);
      if (parent) {
        parent.children!.push(taskWithChildren);
      }
    } else {
      rootTasks.push(taskWithChildren);
    }
  });

  // Sort by order_index at each level
  const sortTasks = (taskList: (ProjectTask & { children?: ProjectTask[] })[]): void => {
    taskList.sort((a, b) => a.order_index - b.order_index);
    taskList.forEach(task => {
      if (task.children && task.children.length > 0) {
        sortTasks(task.children);
      }
    });
  };

  sortTasks(rootTasks);
  return rootTasks;
};

// Generate hierarchical IDs recursively
const generateHierarchicalIdsRecursive = (
  tasks: (ProjectTask & { children?: ProjectTask[] })[],
  parentId: string = '',
  startIndex: number = 1,
  predecessorMap: Map<string, string> = new Map()
): ProcessedTask[] => {
  return tasks.map((task, index) => {
    // Generate hierarchical ID
    const hierarchicalId = parentId ? `${parentId}.${index + startIndex}` : `${index + startIndex}`;
    
    // Store mapping for predecessor transformation
    predecessorMap.set(task.id, hierarchicalId);
    
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
      Predecessor: task.predecessor, // Will be transformed later
      resources: task.resources,
      Resources: task.resources,
      parent_id: task.parent_id,
      ParentID: task.parent_id ? predecessorMap.get(task.parent_id) || null : null,
      order_index: task.order_index,
      OrderIndex: task.order_index,
      created_at: task.created_at,
      updated_at: task.updated_at,
    };

    return processedTask;
  }).flat();
};

// Transform predecessor references from UUIDs to hierarchical IDs
const transformPredecessors = (
  tasks: ProcessedTask[],
  predecessorMap: Map<string, string>
): ProcessedTask[] => {
  return tasks.map(task => {
    if (task.predecessor && task.predecessor.trim()) {
      // Handle multiple predecessors separated by commas
      const predecessors = task.predecessor.split(',').map(pred => {
        const trimmedPred = pred.trim();
        return predecessorMap.get(trimmedPred) || trimmedPred;
      }).join(',');
      
      return {
        ...task,
        Predecessor: predecessors
      };
    }
    return task;
  });
};

// Main function to generate hierarchical IDs from flat task array
export const generateHierarchicalIds = (tasks: ProjectTask[]): ProcessedTask[] => {
  if (!tasks || tasks.length === 0) return [];

  // Build hierarchy
  const hierarchicalTasks = buildTaskHierarchy(tasks);
  
  // Create predecessor mapping
  const predecessorMap = new Map<string, string>();
  
  // Generate hierarchical IDs for all tasks (flatten the hierarchy for processing)
  const flattenHierarchy = (taskList: (ProjectTask & { children?: ProjectTask[] })[]): ProjectTask[] => {
    const result: ProjectTask[] = [];
    taskList.forEach(task => {
      result.push(task);
      if (task.children && task.children.length > 0) {
        result.push(...flattenHierarchy(task.children));
      }
    });
    return result;
  };

  const allTasks = flattenHierarchy(hierarchicalTasks);
  
  // First pass: generate hierarchical IDs and build predecessor map
  let processedTasks: ProcessedTask[] = [];
  
  const processLevel = (
    taskList: (ProjectTask & { children?: ProjectTask[] })[],
    parentId: string = '',
    startIndex: number = 1
  ): void => {
    taskList.forEach((task, index) => {
      const hierarchicalId = parentId ? `${parentId}.${index + startIndex}` : `${index + startIndex}`;
      predecessorMap.set(task.id, hierarchicalId);
      
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
        ParentID: task.parent_id ? predecessorMap.get(task.parent_id) || null : null,
        order_index: task.order_index,
        OrderIndex: task.order_index,
        created_at: task.created_at,
        updated_at: task.updated_at,
      };
      
      processedTasks.push(processedTask);
      
      if (task.children && task.children.length > 0) {
        processLevel(task.children, hierarchicalId, 1);
      }
    });
  };

  processLevel(hierarchicalTasks);
  
  // Second pass: transform predecessor references
  processedTasks = transformPredecessors(processedTasks, predecessorMap);
  
  return processedTasks;
};

// Helper function to find original task ID from hierarchical ID
export const findOriginalTaskId = (hierarchicalId: string, processedTasks: ProcessedTask[]): string | null => {
  const task = processedTasks.find(t => t.TaskID === hierarchicalId);
  return task ? task.OriginalTaskID : null;
};

// Helper function to regenerate hierarchical IDs after CRUD operations
export const regenerateHierarchicalIds = (tasks: ProjectTask[]): ProcessedTask[] => {
  return generateHierarchicalIds(tasks);
};
