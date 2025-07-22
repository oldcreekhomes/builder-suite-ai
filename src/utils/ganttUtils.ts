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

// Main function to generate hierarchical IDs from flat task array
export const generateHierarchicalIds = (tasks: ProjectTask[]): ProcessedTask[] => {
  if (!tasks || tasks.length === 0) return [];

  const processedTasks: ProcessedTask[] = [];
  const hierarchicalIdMap = new Map<string, string>(); // Maps UUID to hierarchical ID
  const childrenMap = new Map<string, ProjectTask[]>(); // Maps parent UUID/hierarchical ID to children
  
  // Build children map - support both UUID and hierarchical parent IDs
  tasks.forEach(task => {
    if (task.parent_id) {
      if (!childrenMap.has(task.parent_id)) {
        childrenMap.set(task.parent_id, []);
      }
      childrenMap.get(task.parent_id)!.push(task);
    }
  });

  // Sort children by order_index
  childrenMap.forEach(children => {
    children.sort((a, b) => a.order_index - b.order_index);
  });

  // Get root tasks (no parent_id)
  const rootTasks = tasks.filter(task => !task.parent_id)
    .sort((a, b) => a.order_index - b.order_index);

  // Process tasks recursively
  const processTasksRecursive = (taskList: ProjectTask[], parentHierarchicalId: string = '') => {
    taskList.forEach((task, index) => {
      const hierarchicalId = parentHierarchicalId 
        ? `${parentHierarchicalId}.${index + 1}` 
        : `${index + 1}`;
      
      hierarchicalIdMap.set(task.id, hierarchicalId);

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
        ParentID: parentHierarchicalId || null,
        order_index: task.order_index,
        OrderIndex: task.order_index,
        created_at: task.created_at,
        updated_at: task.updated_at,
      };

      processedTasks.push(processedTask);

      // Process children - check both UUID and hierarchical ID
      const childrenByUUID = childrenMap.get(task.id) || [];
      const childrenByHierarchicalId = childrenMap.get(hierarchicalId) || [];
      const allChildren = [...childrenByUUID, ...childrenByHierarchicalId];
      
      // Remove duplicates
      const uniqueChildren = allChildren.filter((child, index, arr) => 
        arr.findIndex(c => c.id === child.id) === index
      );
      
      if (uniqueChildren.length > 0) {
        processTasksRecursive(uniqueChildren, hierarchicalId);
      }
    });
  };

  // Start processing from root tasks
  processTasksRecursive(rootTasks);

  // Transform predecessor references from UUIDs to hierarchical IDs
  processedTasks.forEach(task => {
    if (task.predecessor && task.predecessor.trim()) {
      const predecessors = task.predecessor.split(',').map(pred => {
        const trimmedPred = pred.trim();
        return hierarchicalIdMap.get(trimmedPred) || trimmedPred;
      }).join(',');
      
      task.Predecessor = predecessors;
    }
  });

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